const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Konfiguracja bota
const config = {
    token: process.env.BOT_TOKEN,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    welcomeMessage: 'Witamy {user} na serwerze Stable Of Souls! 🌟\n\nMamy nadzieję, że znajdziesz tu wszystko czego szukasz. Miłego pobytu!'
};

// Tworzenie klienta bota
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers // Potrzebne do wykrywania nowych członków
    ]
});

// Wydarzenie gdy bot się uruchomi
client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} jest online!`);
    console.log(`🔗 Zalogowany na ${client.guilds.cache.size} serwer(ach)`);
});

// Wydarzenie gdy ktoś dołączy na serwer
client.on('guildMemberAdd', async (member) => {
    try {
        // Pobieranie kanału powitalnego
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
        
        if (!welcomeChannel) {
            console.log('❌ Nie znaleziono kanału powitalnego!');
            return;
        }

        // Przygotowanie wiadomości powitalnej
        const welcomeText = config.welcomeMessage.replace('{user}', `<@${member.id}>`);
        
        // Wysłanie wiadomości powitalnej
        await welcomeChannel.send(welcomeText);
        
        console.log(`👋 Powitano nowego członka: ${member.user.tag}`);
        
    } catch (error) {
        console.error('❌ Błąd przy wysyłaniu wiadomości powitalnej:', error);
    }
});

// Logowanie błędów
client.on('error', error => {
    console.error('❌ Błąd bota:', error);
});

// Uruchomienie bota
client.login(config.token);