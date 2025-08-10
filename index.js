const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
require('dotenv').config();

// Konfiguracja bota
const config = {
    token: process.env.BOT_TOKEN,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    welcomeMessage: {
        title: '🇺🇸 Hello! {user} on the Stable of Souls server! 👋',
        description: 'We are thrilled to have you join us! To get started, please read the rules ✅ ▶ <#1241676404605583401> and verify yourself in the right channel to gain full access to the server.'
    }
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
        ),
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Zweryfikuj się na serwerze')
        .addStringOption(option =>
            option.setName('sso_name')
                .setDescription('Imię postaci z gry (np. Luca Wolfblanket)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('server_nickname')
                .setDescription('Twój pseudonim (np. Kumi)')
                .setRequired(true))
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
                const welcomeEmbed = new EmbedBuilder()
                    .setDescription(config.welcomeMessage.title.replace('{user}', `<@${interaction.user.id}>`))
                    .addFields({
                        name: '\u200B',
                        value: config.welcomeMessage.description,
                        inline: false
                    })
                    .setColor('#ED4A7B'); // Różowy kolor jak na screenie
                
                // Wysłanie testowej wiadomości
                await welcomeChannel.send({ 
                    embeds: [welcomeEmbed] 
                });
                
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

    if (interaction.commandName === 'verify') {
        try {
            const ssoName = interaction.options.getString('sso_name');
            const serverNickname = interaction.options.getString('server_nickname');
            
            // Tworzenie nowego nicku w formacie ✧ SSO Name ✧ Server Nickname
            const newNickname = `✧ ${ssoName} ✧ ${serverNickname}`;
            
            // ID ról do dodania i usunięcia
            const rolesToAdd = ['1241706227051008061', '1105549622056861898'];
            const rolesToRemove = ['1245065409040748644', '1245417870029230181'];
            const changeNickChannelId = '1274412232855257118';
            
            // Sprawdzenie czy nick nie jest za długi (maksymalnie 32 znaki)
            if (newNickname.length > 32) {
                await interaction.reply({
                    content: '❌ Nick jest za długi! Maksymalnie 32 znaki. Spróbuj skrócić imię postaci lub pseudonim.',
                    ephemeral: true
                });
                return;
            }
            
            const member = interaction.member;
            const botMember = interaction.guild.members.me;
            
            // DEBUGGING - sprawdzenie uprawnień
            console.log(`🔍 Debug - Sprawdzanie uprawnień:`);
            console.log(`🤖 Bot ma uprawnienia Administrator: ${botMember.permissions.has('Administrator')}`);
            console.log(`🤖 Bot ma uprawnienia ManageRoles: ${botMember.permissions.has('ManageRoles')}`);
            console.log(`🤖 Bot ma uprawnienia ManageNicknames: ${botMember.permissions.has('ManageNicknames')}`);
            console.log(`👤 Pozycja roli bota: ${botMember.roles.highest.position}`);
            console.log(`👤 Pozycja roli użytkownika: ${member.roles.highest.position}`);
            console.log(`🔄 Bot może zarządzać użytkownikiem: ${member.manageable}`);
            
            // Sprawdzenie czy użytkownik to właściciel serwera
            if (member.id === interaction.guild.ownerId) {
                await interaction.reply({
                    content: '❌ Nie mogę zmienić nicku właściciela serwera. Zmień nick ręcznie lub użyj konta które nie jest właścicielem serwera.',
                    ephemeral: true
                });
                return;
            }
            
            // Sprawdzenie czy bot może zarządzać tym użytkownikiem
            if (!member.manageable) {
                await interaction.reply({
                    content: '❌ Nie mogę zarządzać Twoimi rolami. Prawdopodobnie masz wyższą rolę niż bot. Skontaktuj się z administratorem.',
                    ephemeral: true
                });
                return;
            }
            
            // Zmiana nicku
            try {
                if (member.id !== interaction.guild.ownerId) {
                    await member.setNickname(newNickname);
                    console.log(`✅ Zmieniono nick na: ${newNickname}`);
                } else {
                    console.log(`⚠️ Pominięto zmianę nicku - użytkownik to właściciel serwera`);
                }
            } catch (nickError) {
                console.log(`❌ Błąd zmiany nicku:`, nickError);
                await interaction.reply({
                    content: '❌ Nie mogę zmienić Twojego nicku. Sprawdź uprawnienia bota.',
                    ephemeral: true
                });
                return;
            }
            
            // Dodawanie ról
            for (const roleId of rolesToAdd) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    console.log(`🔍 Sprawdzanie roli do dodania: ${role.name} (${roleId}), pozycja: ${role.position}`);
                    console.log(`🔍 Bot może zarządzać tą rolą: ${role.editable}`);
                    
                    if (!member.roles.cache.has(roleId)) {
                        try {
                            await member.roles.add(role);
                            console.log(`✅ Dodano rolę: ${role.name} (${roleId})`);
                        } catch (roleError) {
                            console.log(`❌ Błąd dodawania roli ${role.name}:`, roleError);
                        }
                    } else {
                        console.log(`⚠️ Użytkownik już ma rolę: ${role.name} (${roleId})`);
                    }
                } else {
                    console.log(`❌ Nie znaleziono roli o ID: ${roleId}`);
                }
            }
            
            // Usuwanie ról
            for (const roleId of rolesToRemove) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    console.log(`🔍 Sprawdzanie roli do usunięcia: ${role.name} (${roleId}), pozycja: ${role.position}`);
                    console.log(`🔍 Bot może zarządzać tą rolą: ${role.editable}`);
                    
                    if (member.roles.cache.has(roleId)) {
                        try {
                            await member.roles.remove(role);
                            console.log(`🗑️ Usunięto rolę: ${role.name} (${roleId})`);
                        } catch (roleError) {
                            console.log(`❌ Błąd usuwania roli ${role.name}:`, roleError);
                        }
                    } else {
                        console.log(`⚠️ Użytkownik nie ma roli: ${role.name} (${roleId})`);
                    }
                } else {
                    console.log(`❌ Nie znaleziono roli do usunięcia o ID: ${roleId}`);
                }
            }
            
            // Wiadomość o pomyślnej weryfikacji
            const verificationEmbed = new EmbedBuilder()
                .setColor('#00FF00') // Zielony kolor dla sukcesu
                .setTitle('✅ Weryfikacja zakończona pomyślnie!')
                .setDescription(`**Zweryfikowano jako:** ${newNickname}`)
                .addFields({
                    name: '📝 Potrzebujesz zmiany nicku?',
                    value: `Napisz na kanał <#${changeNickChannelId}>`,
                    inline: false
                })
                .setTimestamp();
            
            await interaction.reply({
                embeds: [verificationEmbed],
                ephemeral: true
            });
            
            // Usuwanie wiadomości użytkownika (jeśli to możliwe)
            try {
                if (interaction.channel && interaction.channel.permissionsFor(interaction.guild.members.me).has('ManageMessages')) {
                    // Dla slash commands nie ma co usuwać, bo nie ma wiadomości użytkownika
                    // Ale możemy usunąć odpowiedź bota po czasie
                    setTimeout(async () => {
                        try {
                            await interaction.deleteReply();
                        } catch (err) {
                            // Zignoruj błąd jeśli wiadomość już została usunięta
                        }
                    }, 10000); // Usuń po 10 sekundach
                }
            } catch (error) {
                // Zignoruj błędy związane z usuwaniem wiadomości
            }
            
            console.log(`✅ ${interaction.user.tag} zweryfikował się jako: ${newNickname}`);
            console.log(`🔍 Debug - Role do dodania: ${rolesToAdd.join(', ')}`);
            console.log(`🔍 Debug - Role do usunięcia: ${rolesToRemove.join(', ')}`);
            console.log(`🔍 Debug - Wszystkie role na serwerze:`, interaction.guild.roles.cache.map(r => `${r.name} (${r.id})`).join(', '));
            
        } catch (error) {
            console.error('❌ Błąd przy weryfikacji:', error);
            
            let errorMessage = '❌ Wystąpił błąd podczas weryfikacji.';
            
            if (error.code === 50013) {
                errorMessage = '❌ Bot nie ma uprawnień do zmiany Twojego nicku lub ról. Skontaktuj się z administratorem.';
            }
            
            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
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
        const welcomeEmbed = new EmbedBuilder()
            .setDescription(config.welcomeMessage.title.replace('{user}', `<@${member.id}>`))
            .addFields({
                name: '\u200B',
                value: config.welcomeMessage.description,
                inline: false
            })
            .setColor('#ED4A7B'); // Różowy kolor jak na screenie
        
        // Wysłanie wiadomości powitalnej
        await welcomeChannel.send({ embeds: [welcomeEmbed] });
        
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
