document.addEventListener('alpine:init', () => {

  Alpine.data('app', () => ({
	status:'',
	actorDataLoaded:false,
	actorData:{},
	messageData:null,
	messageDataLoaded:false,
	formatter:null,
	textFilter:'',
	perPageMessages:25,
	pageMessages:1,
	init() {
		console.log('app init');
		this.formatter = new Intl.DateTimeFormat('en-US', {dateStyle:'medium', timeStyle:'long'});

		// Check for cached version
		this.loadCache();
	},
	clearCache() {
		localStorage.removeItem('existingActor');
		localStorage.removeItem('existingMessages');
		window.location.reload();
	},
	dateFormat(d) {
		return this.formatter.format(new Date(d));
	},
	handleDrop(e) {
		let droppedFiles = e.dataTransfer.files;
		if(!droppedFiles) return;

		let file = droppedFiles[0];
		// repeat of logic below, but only 1 line, i'll deal for now
		if(file.type !== 'application/zip' || !file.name.endsWith('.zip')) return;
		this.loadZip(file);
	},
	loadCache() {
		let existingActor = localStorage.getItem('existingActor');
		let existingMessages = localStorage.getItem('existingMessages');
		// only use cache if both
		if(!existingActor || !existingMessages) return;
		console.log('Cached version exists.');
		this.actorData = JSON.parse(existingActor);
		this.actorDataLoaded = true;
		this.messageData = JSON.parse(existingMessages);
		this.messageDataLoaded = true;
	},
	get messages() {
		if(!this.messageData) return [];
		//if(this.textFilter === '') return this.messageData;
		
		/*
		filter by text string, then by page. Because I'm worried the text comp is slowing things down, 
		going to have 2 sets of code here. maybe

		Ok, I ONLY filter by text, date later. We use another property for the pages

		in case i revert:
		let start = (this.pageMessages-1)*this.perPageMessages;
		let end = this.pageMessages*this.perPageMessages;

		return this.messageData.filter(x => {
			if(this.textFilter !== '' && x.object && x.object.content) return x.object.content.toLowerCase().includes(this.textFilter.toLocaleLowerCase());
			return true;
		}).filter((row, index) => {
          if(index >= start && index < end) return true;
        });		

		*/

		/*
		return this.messageData.filter(x => {
			if(x.object && x.object.content) return x.object.content.toLowerCase().includes(this.textFilter.toLocaleLowerCase());
			return true;
		});

		*/
		if(this.textFilter === '') return this.messageData;
		return this.messageData.filter(x => {
			if(x.object && x.object.content) return x.object.content.toLowerCase().includes(this.textFilter.toLocaleLowerCase());
			return true;
		});

	},
	get messagesPaged() {
		let start = (this.pageMessages-1)*this.perPageMessages;
		let end = this.pageMessages*this.perPageMessages;

		return this.messages.filter((row, index) => {
          if(index >= start && index < end) return true;
        });		

	},
	nextPageMessages() {
		if((this.pageMessages * this.perPageMessages) < this.messages.length) this.pageMessages++;
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
		this.actorDataLoaded = true;
		//console.log('test', JSON.stringify(this.actorData,null,'\t'));

		/*
		Filter out type=Announce as I don't think they are important here. But I may regret this.
		Or I mave move them to another set of data
		*/
		this.messageData = JSON.parse((await zipContents.files['outbox.json'].async('text'))).orderedItems.filter(m => m.type === 'Create');

		this.messageDataLoaded = true;

		//cache it
		localStorage.setItem('existingActor', JSON.stringify(this.actorData));
		localStorage.setItem('existingMessages', JSON.stringify(this.messageData));
	},
    prevPageMessages() {
      if(this.pageMessages > 1) this.pageMessages--;
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