const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
require('dotenv').config();

// Konfiguracja bota
const config = {
    token: process.env.BOT_TOKEN,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    reminderChannelId: process.env.REMINDER_CHANNEL_ID || '1241675864362586192', // Fallback na hardcoded ID
    unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID || '1245065409040748644', // Fallback na hardcoded ID
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

// Definicja komendy slash - POPRAWIONA WERSJA
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
        .setDescription('Verify yourself on the server')
        .addStringOption(option =>
            option.setName('sso_name')
                .setDescription('Your character name from the game (e.g. Luca Wolfblanket)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('Your nickname (e.g. Kumi)')
                .setRequired(true)),
    // KOMENDA SOS DO WYSYŁANIA PRZYPOMNIEŃ
    new SlashCommandBuilder()
        .setName('sos')
        .setDescription('Send a manual verification reminder (Admin only)')
].map(command => command.toJSON());

// Funkcja wysyłająca przypomnienie weryfikacji
async function sendVerificationReminder(guild, isManual = false) {
    console.log(`🔍 DEBUG: sendVerificationReminder wywołana, isManual: ${isManual}, guild: ${guild.name}`);
    
    try {
        const channel = guild.channels.cache.get(config.reminderChannelId);
        
        if (!channel) {
            console.log(`❌ Nie znaleziono kanału przypomnień weryfikacji (ID: ${config.reminderChannelId})`);
            return false;
        }
        
        console.log(`📝 DEBUG: Tworzę embed...`);
        
        const reminderEmbed = new EmbedBuilder()
            .setColor('#ED4A7B') // Różowy kolor
            .setTitle('<:comet3:1263460501279604766> Daily Verification Reminder')
            .setDescription('**Don\'t forget to verify yourself on the server!**')
            .addFields({
                name: '\u200B',
                value: '*Use `/verify` command*\n\nExample: `/verify sso_name:Luca Wolfblanket nickname:Kumi`',
                inline: false
            })
            .setImage('https://cdn.discordapp.com/attachments/1241675864362586192/1404097948043837531/image.png?ex=6899f39d&is=6898a21d&hm=b16be4da67bc6d2d0e07d5d63853da3534e18fe51765d69bc4c3933b279abdbf&')
            .setFooter({ text: 'Example' });
        
        console.log(`📤 DEBUG: Wysyłam wiadomość na kanał ${channel.name}...`);
        
        await channel.send({
            content: `<@&${config.unverifiedRoleId}> 👋`,
            embeds: [reminderEmbed]
        });
        
        console.log(`📨 Wysłano ${isManual ? 'manualne' : 'automatyczne'} przypomnienie o weryfikacji do kanału ${channel.name}`);
        return true;
        
    } catch (error) {
        console.error('❌ Błąd wysyłania przypomnienia weryfikacji:', error);
        return false;
    }
}

// Rejestracja komend slash
async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(config.token);
        const guildId = '845651993770721300'; // ID serwera Stable of Souls
        
        console.log('🔄 Czyszczenie starych komend...');
        
        // WYCZYŚĆ WSZYSTKIE STARE KOMENDY (globalne i per serwer)
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
        
        console.log('✅ Wyczyszczono stare komendy');
        console.log('🔄 Rejestrowanie nowych komend...');
        console.log('📋 Komendy do rejestracji:', commands.map(cmd => cmd.name).join(', '));
        
        // REJESTRACJA TYLKO PER SERWER
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands },
        );
        
        console.log('✅ Komendy slash zarejestrowane dla serwera!');
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
    
    // Uruchom system codziennych przypomnień
    startDailyReminders();
});

// System codziennych przypomnień weryfikacji (o 00:00)
function startDailyReminders() {
    const scheduleNextReminder = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Ustaw na 00:00:00
        
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(async () => {
            // Wysłanie przypomnienia o 00:00
            const guild = client.guilds.cache.first(); // Pierwszy serwer (twój serwer)
            if (guild) {
                await sendVerificationReminder(guild, false);
            }
            
            // Zaplanuj następne przypomnienie
            scheduleNextReminder();
            
        }, timeUntilMidnight);
        
        const hoursUntil = Math.round(timeUntilMidnight / 1000 / 60 / 60);
        console.log(`⏰ Następne przypomnienie weryfikacji za: ${hoursUntil} godzin (o 00:00)`);
    };
    
    // Zaplanuj pierwsze przypomnienie
    scheduleNextReminder();
}

// Zabezpieczenie przed podwójnym wykonaniem komend
const processedInteractions = new Set();

// Obsługa komend slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    // Zabezpieczenie przed podwójnym wykonaniem
    if (processedInteractions.has(interaction.id)) {
        console.log(`🔍 DEBUG: Interakcja ${interaction.id} już została przetworzona - pomijam`);
        return;
    }
    
    processedInteractions.add(interaction.id);
    
    // Usuń stare interakcje po 5 minutach (cleanup)
    setTimeout(() => {
        processedInteractions.delete(interaction.id);
    }, 5 * 60 * 1000);

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

    if (interaction.commandName === 'sos') {
        console.log(`🎯 DEBUG: Użytkownik ${interaction.user.tag} użył komendy /sos`);
        console.log(`🎯 DEBUG: Interaction ID: ${interaction.id}`);
        
        try {
            // Sprawdzenie czy użytkownik ma uprawnienia administratora
            if (!interaction.member.permissions.has('Administrator')) {
                console.log(`❌ DEBUG: Brak uprawnień dla ${interaction.user.tag}`);
                await interaction.reply({
                    content: '❌ You need Administrator permissions to use this command.',
                    ephemeral: true
                });
                return;
            }
            
            console.log(`📤 DEBUG: Wysyłam przypomnienie...`);
            
            // Wysłanie manualnego przypomnienia
            const success = await sendVerificationReminder(interaction.guild, true);
            
            console.log(`📥 DEBUG: Przypomnienie wysłane, sukces: ${success}`);
            
            if (success) {
                console.log(`✅ DEBUG: Odpowiadam na interakcję...`);
                await interaction.reply({
                    content: '✅ Verification reminder sent successfully!',
                    ephemeral: true
                });
                console.log(`✅ DEBUG: Odpowiedziałem na interakcję`);
            } else {
                await interaction.reply({
                    content: '❌ Failed to send verification reminder. Check bot permissions and channel ID.',
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('❌ Błąd przy wysyłaniu manualnego przypomnienia:', error);
            
            // Sprawdź czy już nie odpowiedział
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while sending the reminder.',
                    ephemeral: true
                });
            }
        }
    }

    if (interaction.commandName === 'verify') {
        try {
            const ssoName = interaction.options.getString('sso_name');
            const nickname = interaction.options.getString('nickname');
            
            // Tworzenie nowego nicku w formacie ✧ SSO Name ✧ Nickname
            const newNickname = `✧ ${ssoName} ✧ ${nickname}`;
            
            // ID ról do dodania i usunięcia
            const rolesToAdd = ['1241706227051008061', '1105549622056861898'];
            const rolesToRemove = ['1245065409040748644', '1245417870029230181'];
            const changeNickChannelId = '1274412232855257118';
            
            // Sprawdzenie czy nick nie jest za długi (maksymalnie 32 znaki)
            if (newNickname.length > 32) {
                await interaction.reply({
                    content: '❌ Nickname is too long! Maximum 32 characters. Try shortening your character name or nickname.',
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
                    content: '❌ Cannot change the server owner\'s nickname. Please change your nickname manually or use an account that is not the server owner.',
                    ephemeral: true
                });
                return;
            }
            
            // Sprawdzenie czy bot może zarządzać tym użytkownikiem
            if (!member.manageable) {
                await interaction.reply({
                    content: '❌ Cannot manage your roles. You probably have a higher role than the bot. Please contact an administrator.',
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
                    content: '❌ Cannot change your nickname. Please check bot permissions.',
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
                .setTitle('✅ Verification completed successfully!')
                .setDescription(`**Verified as:** ${newNickname}`)
                .addFields({
                    name: '📝 Need a nickname change?',
                    value: `Write on channel <#${changeNickChannelId}>`,
                    inline: false
                })
                .setTimestamp();
            
            await interaction.reply({
                embeds: [verificationEmbed],
                ephemeral: true
            });
            
            // Usuwanie wiadomości użytkownika po 15 sekundach
            try {
                if (interaction.channel && interaction.channel.permissionsFor(interaction.guild.members.me).has('ManageMessages')) {
                    setTimeout(async () => {
                        try {
                            await interaction.deleteReply();
                        } catch (err) {
                            // Zignoruj błąd jeśli wiadomość już została usunięta
                        }
                    }, 15000); // Usuń po 15 sekundach
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
            
            let errorMessage = '❌ An error occurred during verification.';
            
            if (error.code === 50013) {
                errorMessage = '❌ Bot does not have permission to change your nickname or roles. Please contact an administrator.';
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