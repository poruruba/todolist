'use strict';

//var vConsole = new VConsole();

const base_url = "【立ち上げたサーバのURL】";
const TODOIST_CLIENT_ID = "【todoistのClient ID】";
const EXPIRES = 3650;
const UPDARTE_INTERVAL = 10;

var vue_options = {
    el: "#top",
    data: {
        progress_title: '', // for progress-dialog

        target: null,
        view_mode: "today",

        todo_list_expire: [],
        todo_list_today: [],
        todo_list_other: [],
        todo_list_someday: [],
        todo_projects: [],
        todo_notes: [],

        apikey: null,
    },
    computed: {
    },
    methods: {
        toProjectName(id){
            var project = this.todo_projects.find(item => item.id == id);
            return project.name;
        },
        hasNotes(id){
            var note = this.todo_notes.find(item => item.item_id == id );
            if( note ) return true;
            else return false;
        },
        getNotes(id){
            var note = this.todo_notes.find(item => item.item_id == id );
            if( note )
                return note.content;
            else
                return "";
        },
        toDateTimeString: function(target){
            if( !target )
                return "";
            if( target.date.indexOf(':') >= 0 ){
                var d = Date.parse(target.date);
                return new Date(d).toLocaleString();
            }else{
                var d = Date.parse(target.date);
                return new Date(d).toLocaleDateString();
            }
        },
        todo_list_update: async function(silent){
            if( !this.apikey )
                return;

            try{
                if( !silent )
                    this.progress_open();
                var param = {};
                var json = await do_post_apikey(base_url + '/todoist-list', param, this.apikey);

                this.todo_projects = json.projects;
                this.todo_notes = json.notes;

                var today = new Date();
                today.setHours(0, 0, 0, 0)
                var todayTime = today.getTime();
                var tomorrow = new Date();
                tomorrow.setHours(0, 0, 0, 0)
                tomorrow.setDate(tomorrow.getDate() + 1);
                var tomorrowTime = tomorrow.getTime();

                this.todo_list_expire = json.items.filter( item => item.due && Date.parse(item.due.date) < todayTime );
                this.todo_list_today = json.items.filter( item => item.due && Date.parse(item.due.date) >= todayTime && Date.parse(item.due.date) < tomorrowTime );
                this.todo_list_other = json.items.filter( item => item.due && Date.parse(item.due.date) >= tomorrowTime );
                this.todo_list_someday = json.items.filter( item => !item.due );
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                if( !silent )
                    this.progress_close();
            }
        },
        set_apikey: function(){
            var value = prompt("API Keyを指定してください。", this.apikey);
            if( !value )
                return;

            location.href = "https://todoist.com/oauth/authorize?client_id=" + TODOIST_CLIENT_ID + "&scope=data:read&state=" + value;
        },
        show_view_dialog: async function(target){
            this.target = target;
            this.dialog_open('#view_dialog');
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(async (registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }).catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
        }

        this.apikey = Cookies.get('todo_apikey');
        if( searchs.code ){
            var param = {
                code: searchs.code
            };
            history.replaceState(null, null, '.');
            do_post_apikey(base_url + '/todoist-callback', param, searchs.state)
            .then(json =>{
                console.log(json);
                Cookies.set("todo_apikey", searchs.state, { expires: EXPIRES });
                this.apikey = searchs.state;
                this.todo_list_update()
                .then(() =>{
                    setInterval( () =>{
                        this.todo_list_update(true);
                    }, UPDARTE_INTERVAL * 60 * 1000);
                });
            });
        }else
        if( this.apikey ){
            this.todo_list_update()
            .then(() =>{
                setInterval( () =>{
                    this.todo_list_update(true);
                }, UPDARTE_INTERVAL * 60 * 1000);
            });
        }else{
            setTimeout( () =>{
                alert('API Keyを指定してください。');
            }, 0);
        }
     }
};
vue_add_methods(vue_options, methods_bootstrap);
vue_add_components(vue_options, components_bootstrap);
var vue = new Vue( vue_options );

function do_post_apikey(url, body, apikey) {
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "X-API-KEY": apikey });

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