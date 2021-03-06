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

	/**
	 * Executes an AMI command
	 * @param {string} command the AMI command
	 * @param {Object<string,*>} [options={}] dictionary of settings (endpoint, converter, extras, params, context, timeout)
	 * @returns {$.Promise} A JQuery promise object
	 */

	execute(command, options)
	{
		options = options || {};

		const result = $.Deferred();

		/*------------------------------------------------------------------------------------------------------------*/

		const endpoint = (options.endpoint || this.#endpoint).trim();
		const converter = (options.converter || this.#converter).trim();

		const extras = options.extras || {};
		const params = options.params || [];

		const context = options.context || result;
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

		/*------------------------------------------------------------------------------------------------------------*/

		const url               = endpoint                      ;
		const urlWithParameters = endpoint + '?' + $.param(data);

		/*------------------------------------------------------------------------------------------------------------*/

		if(converter === 'AMIXmlToJson.xsl')
		{
			/*--------------------------------------------------------------------------------------------------------*/
			/* JSON FORMAT                                                                                            */
			/*--------------------------------------------------------------------------------------------------------*/

			$.ajax({
				url: url,
				data: data,
				type: 'POST',
				timeout: timeout,
				dataType: 'json',
				xhrFields: {
					withCredentials: true
				},
				success: (data) => {

					const info = JSPath.apply('.AMIMessage.info.$', data);
					const error = JSPath.apply('.AMIMessage.error.$', data);

					if(error.length === 0)
					{
						result.resolveWith(context, [data, info.join('. '), urlWithParameters]);
					}
					else
					{
						result.rejectWith(context, [data, error.join('. '), urlWithParameters]);
					}
				},
				error: (jqXHR, textStatus) => {

					if(textStatus === ((('error'))))
					{
						textStatus = 'service temporarily unreachable';
					}

					if(textStatus === 'parsererror')
					{
						textStatus = 'resource temporarily unreachable';
					}

					const data = {'AMIMessage': [{'error': [{'$': textStatus}]}]};

					result.rejectWith(context, [data, textStatus, urlWithParameters]);
				},
			});

			/*--------------------------------------------------------------------------------------------------------*/
		}
		else
		{
			/*--------------------------------------------------------------------------------------------------------*/
			/* OTHER FORMATS                                                                                          */
			/*--------------------------------------------------------------------------------------------------------*/

			$.ajax({
				url: url,
				data: data,
				type: 'POST',
				timeout: timeout,
				dataType: 'text',
				xhrFields: {
					withCredentials: true
				},
				success: (data) => {

					result.resolveWith(context, [data, data, urlWithParameters]);
				},
				error: (jqXHR, textStatus) => {

					if(textStatus === 'error')
					{
						textStatus = 'service temporarily unreachable';
					}

					result.rejectWith(context, [textStatus, textStatus, urlWithParameters]);
				},
			});

			/*--------------------------------------------------------------------------------------------------------*/
		}

		/*------------------------------------------------------------------------------------------------------------*/

		return result.promise();
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	#guest()
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
			firstName: 'guest',
			lastName: 'guest',
			email: 'N/A',
			country: 'N/A',
			valid: 'false',
			certEnabled: 'false',
			vomsEnabled: 'false',
		}
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * @param {$.Promise}
	 * @param {Object<string,*>} [options={}]
	 * @returns {$.Promise} A JQuery promise object
	 */

	#getUserInfo(deferred, options)
	{
		options = options || {};

		const result = $.Deferred();

		/*------------------------------------------------------------------------------------------------------------*/

		const context = options.context || result;

		/*------------------------------------------------------------------------------------------------------------*/

		deferred.then((data, message) => {

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

			result.resolveWith(context, [data, message, userInfo, roleInfo, bookmarkInfo, dashboardInfo, awfInfo]);

		}, (data, message) => {

			result.rejectWith(context, [data, message, this.#guest(), {}, {}, {}, {}]);
		});

		/*------------------------------------------------------------------------------------------------------------*/

		return result.promise();
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by code
	 * @param {string} code the code
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, context, timeout)
	 * @returns {$.Promise} A JQuery promise object
	 */

	signInByCode(code, options)
	{
		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser="__oidc_code__" -AMIPass=?', {extras: {'NoCert': null}, params: [code]}),
			options
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by token
	 * @param {string} token the token
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, context, timeout)
	 * @returns {$.Promise} A JQuery promise object
	 */

	signInByToken(token, options)
	{
		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser="__oidc_token__" -AMIPass=?', {extras: {'NoCert': null}, params: [token]}),
			options
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by password
	 * @param {string} username the username
	 * @param {string} password the password
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, context, timeout)
	 * @returns {$.Promise} A JQuery promise object
	 */

	signInByPassword(username, password, options)
	{
		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser=? -AMIPass=?', {extras: {'NoCert': null}, params: [username, password]}),
			options
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign in by certificate
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, context, timeout)
	 * @returns {$.Promise} A JQuery promise object
	 */

	signInByCertificate(options)
	{
		return this.#getUserInfo(
			this.execute('GetSessionInfo', {extras: {}, params: []}),
			options
		);
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Sign out
	 * @param {Object<string,*>} [options={}] dictionary of optional parameters (endpoint, converter, context, timeout)
	 * @returns {$.Promise} A JQuery promise object
	 */

	signOut(options)
	{
		return this.#getUserInfo(
			this.execute('GetSessionInfo -AMIUser=? -AMIPass=?', {extras: {'NoCert': null}, params: [(((''))), ((('')))]}),
			options
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
