import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu, Command, requestUrl } from 'obsidian';
import { threadId } from 'worker_threads';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	vlcPassword: string;
	vlcHost: string;
	vlcPort: string;
	forcePlayOnSeek: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	vlcPassword: '',
	vlcHost: 'http://127.0.0.1',
	vlcPort: '8080',
	forcePlayOnSeek: true
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		/*
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});
		*/

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new VLCControlSettingTab(this.app, this));

		/*
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		*/

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
			  const e = view.editor;
			  if(!e) return;
			  const sel = e.getSelection();
			  const title = "Seek VLC to " + ( sel|| '');
			  menu.addItem((item) => {
				item
				  .setTitle( title )
				  .setIcon("chevrons-right")
				  .onClick(() => this.onSeekClick());
			  });
	  
			})
		  );
	}

	constructVLCUrl( command: string, params?: any ){
		
		const vlcHost = this.settings.vlcHost;
		const vlcPort = this.settings.vlcPort;
		
		const p = new URLSearchParams();

		if( params ){
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
		
		// regexp to match timestamps in transcript timestamp, uses groups to match minutes and seconds
		const reTs = /([0-9]+):([0-9]+).[0-9]+/;
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
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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
