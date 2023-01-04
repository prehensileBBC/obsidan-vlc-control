import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu, Command, requestUrl } from 'obsidian';
import { threadId } from 'worker_threads';

// Remember to rename these classes and interfaces!

interface VLCControlSettings {
	vlcPassword: string;
	vlcHost: string;
	vlcPort: string;
	forcePlayOnSeek: boolean;
}

const DEFAULT_SETTINGS: VLCControlSettings = {
	vlcPassword: '',
	vlcHost: 'http://127.0.0.1',
	vlcPort: '8080',
	forcePlayOnSeek: true
}

// regexp to match timestamps in transcript timestamp, uses groups to match minutes and seconds
const reTs = /([0-9]+):([0-9]+).[0-9]+/;


export default class VLCControlPlugin extends Plugin {
	settings: VLCControlSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new VLCControlSettingTab(this.app, this));


		// listen for right-click menu events in an editor window
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				
				// bail if there isn't a current editor view
				const e = view.editor;
			  	if(!e) return;
				
				// bail if current selection doesn't contain a timestamp
				const sel = e.getSelection();
				if( !reTs.test(sel) ) return;

			  	const title = "Seek VLC to " + ( sel|| '');
				
				menu.addItem((item) => {
					item
					.setTitle( title )
					.setIcon( "chevrons-right" )
					.onClick( () => this.onSeekClick() );
				});
	  
			})
		  );
	}

	constructVLCUrl( command: string, params?: any ){
		
		const vlcHost = this.settings.vlcHost;
		const vlcPort = this.settings.vlcPort;
		
		// construct query string for url
		const p = new URLSearchParams();
		if( params ){
			// populate with optional extra parameters
			for( const k in params ){
				p.append( k, params[k] )
			}
		}
		p.append( 'command', command );
		const q = p.toString();

		return `${vlcHost}:${vlcPort}/requests/status.xml?${q}`;
	}

	makeVLCRequest( command: string, params?: object ){
		
		const url = this.constructVLCUrl( command, params );

		const vlcPassword = this.settings.vlcPassword;
		const headers = {'Authorization': 'Basic ' + Buffer.from(`:${vlcPassword}`).toString('base64')};

		console.log( url );

		requestUrl({
			url, 
			headers
		});
	}

	onSeekClick(){
		
		let view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if( !view ) return;
		
		let sel = view.editor.getSelection();
		
		// check that there's a timestamp in the selection
		if( reTs.test( sel ) ){
			
			const matches = sel.match( reTs );
			if(!matches) return;	// bail if there aren't any matches

			const mm = matches[1];  // minutes in transcript timestamp
			const ss = matches[2];	// seconds in transctipt timestap

			const params = {
				'val' : `${mm}M:${ss}S`
			}
			
			this.makeVLCRequest( 'seek', params );

			if( this.settings.forcePlayOnSeek ){
				this.makeVLCRequest( 'pl_forceresume' );
			}
				
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class VLCControlSettingTab extends PluginSettingTab {
	plugin: VLCControlPlugin;

	constructor(app: App, plugin: VLCControlPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for VLC connection'});

		new Setting(containerEl)
			.setName('VLC password')
			.setDesc('HTTP password')
			.addText(text => text
				.setPlaceholder('Enter your password')
				.setValue(this.plugin.settings.vlcPassword)
				.onChange(async (value) => {
					this.plugin.settings.vlcPassword = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('VLC HTTP address')
			.setDesc('URL for VLC HTTP interface, e.g http://127.0.0.1')
			.addText(text => text
				.setPlaceholder( 'VLC host URL' )
				.setValue( this.plugin.settings.vlcHost )
				.onChange( async (value) => {
					this.plugin.settings.vlcHost = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('VLC HTTP port')
			.setDesc('Port for VLC HTTP interface, e.g 8080')
			.addText(text => text
				.setPlaceholder( 'VLC host port' )
				.setValue( this.plugin.settings.vlcPort )
				.onChange( async (value) => {
					this.plugin.settings.vlcPort = value;
					await this.plugin.saveSettings();
				}));
		
		containerEl.createEl('h2', {text: 'Playback behaviour'});

		new Setting(containerEl)
			.setName('Force play on seek')
			.setDesc('Always start playback after seeking')
			.addToggle( toggle => toggle
				.setValue( this.plugin.settings.forcePlayOnSeek )
				.onChange(async (value) => {
					this.plugin.settings.forcePlayOnSeek = value;
					await this.plugin.saveSettings();
				}));
	}
}
