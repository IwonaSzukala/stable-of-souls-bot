const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
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

// Definicja komendy slash
const commands = [
    new SlashCommandBuilder()
        .setName('test')
        .setDescription('Komendy testowe')
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Wyślij testową wiadomość powitalną')
        )
].map(command => command.toJSON());

// Rejestracja komend slash
async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        console.log('🔄 Rejestrowanie komend slash...');
        
        // Dla konkretnego serwera (szybsze)
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, '845651993770721300'),
            { body: commands },
        );
        
        console.log('✅ Komendy slash zarejestrowane!');
    } catch (error) {
        console.error('❌ Błąd rejestracji komend:', error);
    }
}

// Wydarzenie gdy bot się uruchomi
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} jest online!`);
    console.log(`🔗 Zalogowany na ${client.guilds.cache.size} serwer(ach)`);
    
    // Rejestruj komendy slash
    await registerCommands();
});

// Obsługa komend slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'test') {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'welcome') {
            try {
                // Pobieranie kanału powitalnego
                const welcomeChannel = interaction.guild.channels.cache.get(config.welcomeChannelId);
                
                if (!welcomeChannel) {
                    await interaction.reply({
                        content: '❌ Nie znaleziono kanału powitalnego! Sprawdź konfigurację.',
                        ephemeral: true
                    });
                    return;
                }

                // Przygotowanie testowej wiadomości powitalnej
                const testWelcomeMessage = config.welcomeMessage.replace('{user}', `<@${interaction.user.id}>`);
                
                // Wysłanie testowej wiadomości
                await welcomeChannel.send(`**[TEST]** ${testWelcomeMessage}`);
                
                await interaction.reply({
                    content: `✅ Wysłano testową wiadomość powitalną na kanał ${welcomeChannel}!`,
                    ephemeral: true
                });
                
                console.log(`🧪 ${interaction.user.tag} przetestował wiadomość powitalną`);
                
            } catch (error) {
                console.error('❌ Błąd przy testowaniu wiadomości powitalnej:', error);
                await interaction.reply({
                    content: '❌ Wystąpił błąd podczas wysyłania testowej wiadomości.',
                    ephemeral: true
                });
            }
        }
    }
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