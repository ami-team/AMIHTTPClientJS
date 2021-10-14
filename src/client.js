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

	/*----------------------------------------------------------------------------------------------------------------*/
	/* METHODS                                                                                                        */
	/*----------------------------------------------------------------------------------------------------------------*/

	constructor(endpoint)
	{
		this._endpoint = endpoint;	
	}

	/*----------------------------------------------------------------------------------------------------------------*/

	execute(command, settings)
	{
		const result = $.Deferred();

		/*------------------------------------------------------------------------------------------------------------*/

		command = (command || '').trim();

		/*------------------------------------------------------------------------------------------------------------*/

		const endpoint = (settings.endpoint || this._endpoint).trim();
		const converter = (settings.converter || this._converter).trim();

		const context = settings.context || result;
		const timeout = settings.timeout || 120000;

		const extraParam = settings.extraParam || null;
		const extraValue = settings.extraValue || null;

		/*------------------------------------------------------------------------------------------------------------*/

		const data = {};

		data['Command'] = command;

		data['Converter'] = converter;

		if(extraParam)
		{
			data[extraParam] = extraValue;
		}

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
}

/*--------------------------------------------------------------------------------------------------------------------*/
/* BROWSER SUPPORT                                                                                                    */
/*--------------------------------------------------------------------------------------------------------------------*/

if(typeof window !== 'undefined') window.AMIHTTPClient = AMIHTTPClient;

/*--------------------------------------------------------------------------------------------------------------------*/
