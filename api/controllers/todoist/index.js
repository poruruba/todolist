'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');

const FILE_BASE = './data/todoist/';

const TODOIST_CLIENT_ID = "ytodoist‚ÌClient IDz";
const TODOIST_CLIENT_SECRET = "ytodoist‚ÌClient secretz";

const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const Headers = fetch.Headers;
const fs = require('fs').promises;
const Todoist = require('todoist').v8;

exports.handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	var apikey = event.requestContext.apikeyAuth.apikey;
	if( !checkAlnum(apikey) )
		throw 'apikey invalid';

	var conf = await readConfigFile(apikey);
	
	if( event.path == '/todoist-callback' ){
		var param = {
			client_id: TODOIST_CLIENT_ID,
			client_secret: TODOIST_CLIENT_SECRET,
			code: body.code
		};
		var json = await do_post("https://todoist.com/oauth/access_token", param );

		conf.token = json;
		await writeConfigFile(apikey, conf);

		return new Response({});
	}else
	if( event.path == '/todoist-list' ){
		const todoist = Todoist(conf.token.access_token);
		await todoist.sync();
		const projects = todoist.projects.get();
		var favorite = projects.filter(item => item.is_favorite );
		var favorite_ids = favorite.map(item => item.id);
		const items = todoist.items.get();
		var favorite_items = items.filter(item => favorite_ids.includes(item.project_id));

		const notes = todoist.notes.get();
		var item_ids = favorite_items.map(item => item.id);
		var favorite_notes = notes.filter(item => item_ids.includes(item.item_id));

		return new Response({items: favorite_items, projects: projects, notes: favorite_notes });
	}
};

function do_post(url, body) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });

  return fetch(new URL(url).toString(), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
      return response.json();
    });
}

function checkAlnum(str){
	var ret =  str.match(/([a-z]|[A-Z]|[0-9])/gi);
	return (ret.length == str.length )
}

async function readConfigFile(apikey){
	try{
		var conf = await fs.readFile(FILE_BASE + apikey + '.json', 'utf8');
		if( !conf ){
			conf = {};
			await writeConfigFile(apikey, conf);
		}else{
			conf = JSON.parse(conf);
		}
		return conf;
	}catch(error){
		throw "not found";
	}

}

async function writeConfigFile(apikey, conf){
	await fs.writeFile(FILE_BASE + apikey + '.json', JSON.stringify(conf, null, 2), 'utf8');
}
