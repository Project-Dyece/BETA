const commando = require('./CommandoV12/src/index.js');
const { CommandoClient } = require('./CommandoV12/src/index.js');
const path = require('path');
const { readdirSync } = require('fs');

// inicializa o lowDB
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('usersOffDB.json');
const usersOffDB = low(adapter);

// inicializa o banco de dados (firebase) e exporta o banco Online
const admin = require('firebase-admin');
const serviceAccount = require('./ServiceAccount.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://dyece-cfb24.firebaseio.com',
});

const db = admin.firestore();
module.exports.db = db;

// guarda os dados localmente e exporta o banco Offline
const usersOn = db.collection('usuarios').doc('usuarios');
module.exports.usersOn = usersOn;

usersOn.get().then((snap) => {
	const usersOff = new Map(Object.entries(snap.data()));

	usersOff.forEach((user) => {
		usersOffDB.set(`${user.id}`, user).write();
	});

	module.exports.usersOffDB = usersOffDB;
});

setInterval(async () => {
	usersOn.update(usersOffDB.getState()).then(() => console.log('Update concluído com suscesso'));
}, 3600000);

// cria um client do Comando
const donos = new Set();
donos.add('380512056413257729');
donos.add('395592015611428864');
const client = new CommandoClient({
	commandPrefix: 'd?',
	unknownCommandResponse: false,
	owner: donos,
	disableEveryone: true,
});

// registra os comandos no client do Commando
client.registry
	.registerDefaults()
	.registerGroups([
		['autorespostas', 'Auto Respostas'],
		['utilidades', 'Utilidades'],
		['interação', 'Interação entre Membros'],
		['singleplayer', 'Jogos Single Player'],
		['imgs-ia', 'Imagens Geradas com Inteligência Artificial'],
		['p&i', 'Perfil & Inventário'],
		['adm', 'Reservados á Staff'],
		['eventos', 'Relacionados a Eventos'],
	])
	.registerCommandsIn(path.join(__dirname, 'Comandos'));

module.exports.client = client;

// Event Handler(Project-A) && erros
const evtFiles = readdirSync('./Eventos/');
console.log('log', `Carregando o total de ${evtFiles.length} eventos`);
evtFiles.forEach((f) => {
	const eventName = f.split('.')[0];
	const event = require(`./Eventos/${f}`);

	client.on(eventName, event.bind(null, client));
});
client
	.on('error', console.error)
	.on('warn', console.warn)
	.on('debug', (debug) => { if (!debug.includes('[WS => ')) console.log(debug); })
	.on('disconnect', () => { console.warn('Disconectado!'); })
	.on('reconnecting', () => { console.warn('Reconectando...'); })
	.on('commandError', (cmd, err) => {
		if (err instanceof commando.FriendlyError) return;
		console.error(`Erro no comando ${cmd.groupID}:${cmd.memberName}`, err);
	})
	.on('commandBlocked', (msg, reason) => {
		console.log(`Comando ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''} bloqueado; ${reason}`);
	});


// login && token
client.login(process.env.DISCORD_AUTH_TOKEN);