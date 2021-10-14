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

export default class AMIHTTPClient
{
	/*----------------------------------------------------------------------------------------------------------------*/
	/* VARIABLES                                                                                                      */
	/*----------------------------------------------------------------------------------------------------------------*/

	_endpoint = 'http://xxyy.zz';

	_converter = 'AMIXmlToJson.xsl';

	_paramRegExp = new RegExp('-\\W*([a-zA-Z][a-zA-Z0-9]*)\\W*=\\W*\\?', 'g');

	/*----------------------------------------------------------------------------------------------------------------*/
	/* METHODS                                                                                                        */
	/*----------------------------------------------------------------------------------------------------------------*/

	constructor(endpoint)
	{
		this._endpoint = endpoint;	
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	execute(command, options)
	{
		options = options || {};

		const result = $.Deferred();

		/*------------------------------------------------------------------------------------------------------------*/

		const endpoint = (options.endpoint || this._endpoint).trim();
		const converter = (options.converter || this._converter).trim();

		const extras = options.extras || {};
		const params = options.params || [];

		const context = options.context || result;
		const timeout = options.timeout || 120000;

		/*------------------------------------------------------------------------------------------------------------*/

		command = (command || '').trim().replace(this._paramRegExp, (x, y) => {

			return `-${y}="${String(params.shift()).replace('\\', '\\\\').replace('\n', '\\n').replace('"', '\\"').replace('\'', '\\\'')}"`;
		});

		/*------------------------------------------------------------------------------------------------------------*/

		const data = {
			...extras,
			Command: command,
			Converter: converter,
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

	signInByPassword(username, password, options)
	{
		options = options || {};

		const result = $.Deferred();

		/*------------------------------------------------------------------------------------------------------------*/

		const context = options.context || result;

		/*------------------------------------------------------------------------------------------------------------*/

		this.execute('GetSessionInfo -AMIUser=? -AMIPass=?', {extras: {'NoCert': null}, params: [username, password]}).then((data, message) => {

			const userInfo = {};
			const roleInfo = {};
			const bookmarkInfo = {};
			const udpInfo = {};
			const ssoInfo = {};

			JSPath.apply('..rowset{.@type==="user"}.row.field', data).forEach((item) => {

				userInfo[item['@name']] = item['$'];
			});

			JSPath.apply('..rowset{.@type==="udp"}.row.field', data).forEach((item) => {

				udpInfo[item['@name']] = item['$'];
			});

			JSPath.apply('..rowset{.@type==="sso"}.row.field', data).forEach((item) => {

				ssoInfo[item['@name']] = item['$'];
			});

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

			result.resolveWith(context, [data, message, userInfo, roleInfo, bookmarkInfo, udpInfo, ssoInfo]);

		}, (data, message) => {

			result.rejectWith(context, [data, message, {AMIUser: 'guest', guestUser: 'guest'}, {}, {}, {}, {}]);
		});

		/*------------------------------------------------------------------------------------------------------------*/

		return result.promise();
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	signInByCertificate(options)
	{
		options = options || {};

		const result = $.Deferred();

		/*------------------------------------------------------------------------------------------------------------*/

		const context = options.context || result;

		/*------------------------------------------------------------------------------------------------------------*/

		this.execute('GetSessionInfo').then((data, message) => {

			const userInfo = {};
			const roleInfo = {};
			const bookmarkInfo = {};
			const udpInfo = {};
			const ssoInfo = {};

			JSPath.apply('..rowset{.@type==="user"}.row.field', data).forEach((item) => {

				userInfo[item['@name']] = item['$'];
			});

			JSPath.apply('..rowset{.@type==="udp"}.row.field', data).forEach((item) => {

				udpInfo[item['@name']] = item['$'];
			});

			JSPath.apply('..rowset{.@type==="sso"}.row.field', data).forEach((item) => {

				ssoInfo[item['@name']] = item['$'];
			});

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

			result.resolveWith(context, [data, message, userInfo, roleInfo, bookmarkInfo, udpInfo, ssoInfo]);

		}, (data, message) => {

			result.rejectWith(context, [data, message, {AMIUser: 'guest', guestUser: 'guest'}, {}, {}, {}, {}]);
		});

		/*------------------------------------------------------------------------------------------------------------*/

		return result.promise();
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	signOut(options)
	{
		options = options || {};

		const result = $.Deferred();

		/*------------------------------------------------------------------------------------------------------------*/

		const context = options.context || result;

		/*------------------------------------------------------------------------------------------------------------*/

		this.execute('GetSessionInfo -AMIUser=? -AMIPass=?', {extras: {'NoCert': null}, params: ['', '']}).then((data, message) => {

			const userInfo = {};
			const roleInfo = {};
			const bookmarkInfo = {};
			const udpInfo = {};
			const ssoInfo = {};

			JSPath.apply('..rowset{.@type==="user"}.row.field', data).forEach((item) => {

				userInfo[item['@name']] = item['$'];
			});

			JSPath.apply('..rowset{.@type==="udp"}.row.field', data).forEach((item) => {

				udpInfo[item['@name']] = item['$'];
			});

			JSPath.apply('..rowset{.@type==="sso"}.row.field', data).forEach((item) => {

				ssoInfo[item['@name']] = item['$'];
			});

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

			result.resolveWith(context, [data, message, userInfo, roleInfo, bookmarkInfo, udpInfo, ssoInfo]);

		}, (data, message) => {

			result.rejectWith(context, [data, message, {AMIUser: 'guest', guestUser: 'guest'}, {}, {}, {}, {}]);
		});

		/*------------------------------------------------------------------------------------------------------------*/

		return result.promise();
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	jspath(path, json)
	{
		return JSPath.apply(path, json);
	}

	/*----------------------------------------------------------------------------------------------------------------*/
}

/*--------------------------------------------------------------------------------------------------------------------*/
/* BROWSER SUPPORT                                                                                                    */
/*--------------------------------------------------------------------------------------------------------------------*/

if(typeof window !== 'undefined') window.AMIHTTPClient = AMIHTTPClient;

/*--------------------------------------------------------------------------------------------------------------------*/
