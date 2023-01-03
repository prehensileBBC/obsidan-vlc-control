import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu, Command, requestUrl } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	vlcPassword: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	vlcPassword: ''
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

	onSeekClick(){
		let view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if( !view ) return;
		let slection = view.editor.getSelection();
		
		const reTs = /([0-9]+):([0-9]+).[0-9]+/;
		if( reTs.test( slection ) ){
			
			const matches = slection.match( reTs );
			if(!matches) return;

			const mm = matches[1];
			const ss = matches[2];
			const url = `http://127.0.0.1:8080/requests/status.xml?command=seek&val=${mm}M:${ss}S`;

			new Notice( url );
			console.log( url );
			
			let headers = {'Authorization': 'Basic ' + Buffer.from(":vetinari").toString('base64')};
			//let headers = { "Authorization": "Basic OnZldGluYXJp" };

			requestUrl({
				url, 
				headers
			});
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

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('VLC password')
			.setDesc('Password for HTTP access to VLC')
			.addText(text => text
				.setPlaceholder('Enter your password')
				.setValue(this.plugin.settings.vlcPassword)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.vlcPassword = value;
					await this.plugin.saveSettings();
				}));
	}
}
