document.addEventListener('alpine:init', () => {

  Alpine.data('app', () => ({
	intro:true,
	status:'',
	actorData:null,
	messageData:null,
	formatter:null,
	init() {
		console.log('app init');
		this.formatter = new Intl.DateTimeFormat('en-US', {dateStyle:'medium', timeStyle:'long'});
	},
	dateFormat(d) {
		return this.formatter.format(new Date(d));
	},
	handleFile(e) {
		/*
		I'll be fired when the user selects a file, or drops a file. I will validate a zip was chosen.
		*/
		let file = this.$refs.selectFile.files[0];
		if(!file) return;
		/*
		validate type is zip, but, .app on mac shows as zip too, so we will check the name as well
		well shit, even when picking .app, file.name is something.app.zip, will ignore for now
		*/
		if(file.type !== 'application/zip' || !file.name.endsWith('.zip')) return;
		console.log('valid file', file.type, file.name);
		this.loadZip(file);
	},
	async loadZip(file) {
		this.status = 'Checking zip file.';
		let zip = new JSZip();
		let zipContents = await zip.loadAsync(file);

		let names = Object.keys(zipContents.files);
		if(!this.validateArchive(names)) {
			this.status = 'This does not appear to be a valid Mastodon archive.';
			return;
		} 
		
		//this.status = 'Zip file parsed and this appears to be a valid archive.';
		this.status = '';

		// read in actor and outbox for processing
		this.actorData = JSON.parse((await zipContents.files['actor.json'].async('text')));		
		console.log('test', JSON.stringify(this.actorData,null,'\t'));

		this.messageData = JSON.parse((await zipContents.files['outbox.json'].async('text'))).orderedItems;
	},
	validateArchive(names) {
		/*
		our 'rules' for valid archive are:
		must have outbox.json and actor.json
		this could be improved 
		*/
		return names.includes('outbox.json') && names.includes('actor.json');
	}
  }));

});