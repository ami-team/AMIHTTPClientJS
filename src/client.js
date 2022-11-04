/*!
 * AMI HTTP Client Java
 *
 * Copyright (c) 2014-2021 The AMI Team, CNRS/LPSC
 *
 * This file must be used under the terms of the CeCILL-C:
 * http://www.cecill.info/licences/Licence_CeCILL-C_V1-en.html
 * http://www.cecill.info/licences/Licence_CeCILL-C_V1-fr.html
 *
 */

'use strict';

/*--------------------------------------------------------------------------------------------------------------------*/

import JSPath from 'jspath';

/*--------------------------------------------------------------------------------------------------------------------*/
/* CLIENT                                                                                                             */
/*--------------------------------------------------------------------------------------------------------------------*/

// noinspection JSUnusedGlobalSymbols

/**
 * Class representing an AMI HTTP client
 */

class AMIHTTPClient
{
	/*----------------------------------------------------------------------------------------------------------------*/
	/* PUBLIC VARIABLES                                                                                               */
	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Library version
	 * @type {string}
	 */

	version = '{{VERSION}}';

	/*----------------------------------------------------------------------------------------------------------------*/
	/* PRIVATE VARIABLES                                                                                              */
	/*----------------------------------------------------------------------------------------------------------------*/

	#endpoint = '';

	#converter = 'AMIXmlToJson.xsl';

	#paramRegExp = new RegExp('-\\W*([a-zA-Z][a-zA-Z0-9]*)\\W*=\\W*\\?', 'g');

	/*----------------------------------------------------------------------------------------------------------------*/

	#errorMessage = 'resource temporarily unreachable';

	/*----------------------------------------------------------------------------------------------------------------*/
	/* METHODS                                                                                                        */
	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * An AMI HTTP client
	 * @param {string} endpoint the endpoint
	 * @returns {AMIHTTPClient} The AMI HTTP client
	 */

	constructor(endpoint)
	{
		this.#endpoint = endpoint;
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Get the client HTTP endpoint
	 * @returns {string} The client HTTP endpoint
	 */

	getEndpoint()
	{
		return this.#endpoint;
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	static #error(message)
	{
		return {'AMIMessage': [{'error': [{'$': message}]}]};
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Executes an AMI command
	 * @param {string} command the AMI command
	 * @param {Object<string,*>} [options={}] dictionary of settings (endpoint, converter, extras, params, timeout)
	 * @returns {Promise} A JavaScript promise object
	 */

	execute(command, options)
	{
		options = options || {};

		/*------------------------------------------------------------------------------------------------------------*/

		const endpoint = (options.endpoint || this.#endpoint).trim();
		const converter = (options.converter || this.#converter).trim();

		const extras = options.extras || {};
		const params = options.params || [];

		const timeout = options.timeout || 120000;

		/*------------------------------------------------------------------------------------------------------------*/

		command = (command || '').trim().replace(this.#paramRegExp, (x, y) => {

			const rawValue = params.shift();

			return Object.prototype.toString.call(rawValue) === '[object String]' ? `-${y}=${JSON.stringify(rawValue)}`
			                                                                      : `-${y}="${JSON.stringify(rawValue)}"`
			;
		});

		/*------------------------------------------------------------------------------------------------------------*/

		const data = {
			Command: command,
			Converter: converter,
			...extras,
		};

		const body = Object.entries(data).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

		/*------------------------------------------------------------------------------------------------------------*/

		const url               = endpoint             ;
		const urlWithParameters = endpoint + '?' + body;

		/*------------------------------------------------------------------------------------------------------------*/

		return new Promise((resolve, reject) => {

			if(converter === 'AMIXmlToJson.xsl')
			{
				/*----------------------------------------------------------------------------------------------------*/
				/* JSON FORMAT                                                                                        */
				/*----------------------------------------------------------------------------------------------------*/

				let inTime = true;

				const timeoutId = setTimeout(() => {

					reject(AMIHTTPClient.#error('timeout'), 'timeout', urlWithParameters);

					inTime = false;

				}, timeout);

				/*----------------------------------------------------------------------------------------------------*/

				fetch(url, {
					body: body,
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					},
					credentials: 'include',
					cache: 'no-cache',
					mode: 'cors',
				}).finally(() => {

					clearTimeout(timeoutId);

				}).then((response) => {

					if(inTime)
					{
						response.json().then((data) => {

							const info = JSPath.apply('.AMIMessage.info.$', data);
							const error = JSPath.apply('.AMIMessage.error.$', data);

							if(error.length === 0)
							{
								resolve(data, info.join('. '), urlWithParameters);
							}
							else
							{
								reject(data, error.join('. '), urlWithParameters);
							}

						}).catch(() => {

							reject(AMIHTTPClient.#error(this.#errorMessage), this.#errorMessage, urlWithParameters);
						});
					}

				}).catch(() => {

					if(inTime)
					{
						reject(AMIHTTPClient.#error(this.#errorMessage), this.#errorMessage, urlWithParameters);
					}
				});

				/*----------------------------------------------------------------------------------------------------*/
			}
			else
			{
				/*----------------------------------------------------------------------------------------------------*/
				/* OTHER FORMATS                                                                                      */
				/*----------------------------------------------------------------------------------------------------*/

				let inTime = true;

				const timeoutId = setTimeout(() => {

					reject('timeout', 'timeout', urlWithParameters);

					inTime = false;

				}, timeout);

				/*----------------------------------------------------------------------------------------------------*/

				fetch(url, {
					body: body,
					method: 'POST',
					headers: {
						'Accept': 'text/plain',
						'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					},
					credentials: 'include',
					cache: 'no-cache',
					mode: 'cors',
				}).finally(() => {

					clearTimeout(timeoutId);

				}).then((response) => {

					if(inTime)
					{
						response.text().then((data) => {

							resolve(data, data, urlWithParameters);

						}).catch(() => {

							reject(this.#errorMessage, this.#errorMessage, urlWithParameters);
						});
					}

				}).catch(() => {

					if(inTime)
					{
						reject(this.#errorMessage, this.#errorMessage, urlWithParameters);
					}
				});

				/*----------------------------------------------------------------------------------------------------*/
			}
		});

		/*------------------------------------------------------------------------------------------------------------*/
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	static #guest()
	{
		return {
			AMIUser: 'guest',
			guestUser: 'guest',
			clientDNInAMI: '',
			issuerDNInAMI: '',
			clientDNInSession: '',
			issuerDNInSession: '',
			notBefore: '',
			notAfter: '',
			mqttToken: '',
			firstName: 'guest',
			lastName: 'guest',
			email: 'N/A',
			country: 'N/A',
			valid: 'false'
		}
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * @param {Promise} promise
	 * @returns {Promise} A JavaScript promise object
	 */

	#getUserInfo(promise)
	{
		/*------------------------------------------------------------------------------------------------------------*/

		return new Promise((resolve, reject) => {

			promise.then((data, message) => {

				const userInfo = {};
				const roleInfo = {};
				const bookmarkInfo = {};
				const dashboardInfo = {};
				const awfInfo = {};

				/*--------------------------------------------------------------------------------------------------------*/

				JSPath.apply('..rowset{.@type==="user"}.row.field', data).forEach((item) => {

					userInfo[item['@name']] = item['$'];
				});

				/*--------------------------------------------------------------------------------------------------------*/

				JSPath.apply('..rowset{.@type==="awf"}.row.field', data).forEach((item) => {

					awfInfo[item['@name']] = item['$'];
				});

				/*--------------------------------------------------------------------------------------------------------*/

				JSPath.apply('..rowset{.@type==="role"}.row', data).forEach((row) => {

					let name = '';
					const role = {};

					row.field.forEach((field) => {

						role[field['@name']] = field['$'];

						if(field['@name'] === 'name')
						{
							name = field['$'];
						}
					});

					roleInfo[name] = role;
				});

				/*--------------------------------------------------------------------------------------------------------*/

				JSPath.apply('..rowset{.@type==="bookmark"}.row', data).forEach((row) => {

					let hash = '';
					const bookmark = {};

					row.field.forEach((field) => {

						bookmark[field['@name']] = field['$'];

						if(field['@name'] === 'hash')
						{
							hash = field['$'];
						}
					});

					bookmarkInfo[hash] = bookmark;
				});

				/*--------------------------------------------------------------------------------------------------------*/

				JSPath.apply('..rowset{.@type==="dashboard"}.row', data).forEach((row) => {

					let hash = '';
					const dashboard = {};

					row.field.forEach((field) => {

						dashboard[field['@name']] = field['$'];

						if(field['@name'] === 'hash')
						{
							hash = field['$'];
						}
					});

					dashboardInfo[hash] = dashboard;
				});

				/*--------------------------------------------------------------------------------------------------------*/

				resolve(data, message, userInfo, roleInfo, bookmarkInfo, dashboardInfo, awfInfo);

			}).catch((data, message) => {

				reject(data, message, AMIHTTPClient.#guest(), {}, {}, {}, {});
			});
		});

		/*------------------------------------------------------------------------------------------------------------*/
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by code
	 * @param {string} code the code
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, timeout)
	 * @returns {Promise} A JavaScript promise object
	 */

	signInByCode(code, options)
	{
		options = options || {};

		options['extras'] = {'NoCert': null};
		options['params'] = [code];

		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser="__oidc_code__" -AMIPass=?', options)
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by token
	 * @param {string} token the token
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, timeout)
	 * @returns {Promise} A JavaScript promise object
	 */

	signInByToken(token, options)
	{
		options = options || {};

		options['extras'] = {'NoCert': null};
		options['params'] = [token];

		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser="__oidc_token__" -AMIPass=?', options)
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by password
	 * @param {string} username the username
	 * @param {string} password the password
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, timeout)
	 * @returns {Promise} A JavaScript promise object
	 */

	signInByPassword(username, password, options)
	{
		options = options || {};

		options['extras'] = {'NoCert': null};
		options['params'] = [username, password];

		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser=? -AMIPass=?', options)
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by certificate
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, timeout)
	 * @returns {Promise} A JavaScript promise object
	 */

	signInByCertificate(options)
	{
		options = options || {};

		options['extras'] = {};
		options['params'] = [];

		return this.#getUserInfo(
			this.execute('GetSessionInfo', options)
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign out
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, timeout)
	 * @returns {Promise} A JavaScript promise object
	 */

	signOut(options)
	{
		options = options || {};

		options['extras'] = {'NoCert': null};
		options['params'] = [(((''))), ((('')))];

		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser=? -AMIPass=?', options)
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Finds data within the given JSON, see {@link https://github.com/dfilatov/jspath}
	 * @param {string} path the path
	 * @param {Object<string,*>} json the JSON
	 * @returns {Array<*>} The resulting array
	 */

	jspath(path, json)
	{
		return JSPath.apply(path, json);
	}

	/*----------------------------------------------------------------------------------------------------------------*/
}

/*--------------------------------------------------------------------------------------------------------------------*/
/* BROWSER & MODULE SUPPORT                                                                                           */
/*--------------------------------------------------------------------------------------------------------------------*/

if(typeof window !== 'undefined') window.AMIHTTPClient = AMIHTTPClient;

/*--------------------------------------------------------------------------------------------------------------------*/

export default AMIHTTPClient;

/*--------------------------------------------------------------------------------------------------------------------*/
