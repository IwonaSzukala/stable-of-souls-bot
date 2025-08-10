const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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

// Definicja komendy slash - UPROSZCZONE
const commands = [
    new SlashCommandBuilder()
        .setName('test')
        .setDescription('Komendy testowe')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Wyślij testową wiadomość powitalną')
        ),
    // KOMENDA VERIFY - BEZ ŻADNYCH PERMISSIONS
    {
        name: 'verify',
        description: 'Verify yourself on the server',
        options: [
            {
                name: 'sso_name',
                description: 'Your character name from the game (e.g. Luca Wolfblanket)',
                type: 3, // STRING
                required: true
            },
            {
                name: 'nickname', 
                description: 'Your nickname (e.g. Kumi)',
                type: 3, // STRING
                required: true
            }
        ]
    },
    new SlashCommandBuilder()
        .setName('sos')
        .setDescription('Send a manual verification reminder (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

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
            .setColor('#dd3abc')
            .setTitle('<a:9434magentaverification:1245033014514159706> Verification Reminder')
            .setDescription('**Don\'t forget to verify yourself on the server!**')
            .addFields({
                name: 'How to verify?',
                value: '<a:4484pinkarrow:889196250828775445> Use `/verify` command',
                inline: false
            })
            .setImage('https://cdn.discordapp.com/attachments/1241719228319404043/1404163504604446750/image.png?ex=689a30ab&is=6898df2b&hm=d583daebfcc2b81462639efc65af3aa62999826c4b7004e6101aad1208e8d8f7&')
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
        
        console.log('🔄 Rozpoczynam rejestrację komend...');
        console.log('🔍 DEBUG: Client user ID:', client.user.id);
        console.log('🔍 DEBUG: Guild ID:', guildId);
        
        // NAJPIERW sprawdź aktualne komendy
        console.log('📋 Sprawdzam obecne komendy na serwerze...');
        try {
            const existingCommands = await rest.get(Routes.applicationGuildCommands(client.user.id, guildId));
            console.log(`📊 Obecne komendy na serwerze: ${existingCommands.length}`);
            existingCommands.forEach(cmd => {
                console.log(`- ${cmd.name} (permissions: ${cmd.default_member_permissions})`);
            });
        } catch (checkError) {
            console.log('⚠️ Nie można sprawdzić obecnych komend:', checkError.message);
        }
        
        // WYCZYŚĆ WSZYSTKIE STARE KOMENDY (globalne i serwer)
        console.log('🧹 Usuwam wszystkie komendy globalne...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        
        console.log('🧹 Usuwam wszystkie komendy serwera...');
        await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
        
        // DŁUGSZE OPÓŹNIENIE dla Render.com
        console.log('⏳ Czekam 5 sekund na synchronizację Discord...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // DEBUGOWANIE KAŻDEJ KOMENDY PRZED REJESTRACJĄ
        console.log('🔍 Komendy które będą zarejestrowane:');
        commands.forEach((cmd, index) => {
            console.log(`${index + 1}. ${cmd.name}`);
            console.log(`   - Description: ${cmd.description}`);
            console.log(`   - Permissions: ${cmd.default_member_permissions}`);
            console.log(`   - Options: ${cmd.options ? cmd.options.length : 0}`);
        });
        
        // REJESTRACJA KOMEND
        console.log('📝 Rejestruję nowe komendy...');
        const registeredCommands = await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands },
        );
        
        console.log('✅ Komendy zarejestrowane pomyślnie!');
        console.log(`📊 Zarejestrowano ${registeredCommands.length} komend`);
        
        // WERYFIKACJA - sprawdź czy się zarejestrowały
        registeredCommands.forEach((cmd, index) => {
            console.log(`✅ ${index + 1}. ${cmd.name}`);
            console.log(`   - ID: ${cmd.id}`);
            console.log(`   - Permissions: ${cmd.default_member_permissions}`);
            console.log(`   - Guild only: ${cmd.guild_id ? 'TAK' : 'NIE'}`);
        });
        
        // DODATKOWA WERYFIKACJA - spróbuj ponownie pobrać komendy
        console.log('🔍 Weryfikuję czy komendy rzeczywiście się zarejestrowały...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
            const verifyCommands = await rest.get(Routes.applicationGuildCommands(client.user.id, guildId));
            console.log(`✅ Weryfikacja: znaleziono ${verifyCommands.length} komend na serwerze`);
            
            const verifyCommand = verifyCommands.find(cmd => cmd.name === 'verify');
            if (verifyCommand) {
                console.log('✅ Komenda verify jest dostępna!');
                console.log(`   - ID: ${verifyCommand.id}`);
                console.log(`   - Permissions: ${verifyCommand.default_member_permissions}`);
                console.log(`   - Guild ID: ${verifyCommand.guild_id}`);
                
                // SPRAWDŹ SZCZEGÓŁY KOMENDY
                try {
                    const commandDetails = await rest.get(Routes.applicationGuildCommand(client.user.id, guildId, verifyCommand.id));
                    console.log('🔍 Szczegóły komendy verify:');
                    console.log(`   - Name: ${commandDetails.name}`);
                    console.log(`   - Description: ${commandDetails.description}`);
                    console.log(`   - Type: ${commandDetails.type}`);
                    console.log(`   - Default permissions: ${commandDetails.default_member_permissions}`);
                    console.log(`   - DM permission: ${commandDetails.dm_permission}`);
                    console.log(`   - NSFW: ${commandDetails.nsfw}`);
                } catch (detailError) {
                    console.log('⚠️ Nie można pobrać szczegółów komendy:', detailError.message);
                }
                
            } else {
                console.log('❌ Komenda verify NIE została znaleziona!');
            }
            
            // SPRAWDŹ CZY KTÓRAŚ KOMENDA MA PROBLEMY Z PERMISSIONS
            verifyCommands.forEach(cmd => {
                console.log(`📋 Komenda: ${cmd.name}`);
                console.log(`   - Permissions: ${cmd.default_member_permissions}`);
                console.log(`   - Available to everyone: ${cmd.default_member_permissions === null || cmd.default_member_permissions === '0'}`);
            });
            
        } catch (verifyError) {
            console.error('❌ Błąd weryfikacji komend:', verifyError.message);
        }
        
        // SPRAWDŹ UPRAWNIENIA DO APPLICATION COMMANDS na serwerze
        console.log('\n🔍 === SPRAWDZANIE UPRAWNIEŃ APPLICATION COMMANDS ===');
        try {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const botMember = guild.members.me;
                const canUseCommands = botMember.permissions.has('UseApplicationCommands');
                const canManageCommands = botMember.permissions.has('ManageGuild') || botMember.permissions.has('Administrator');
                
                console.log(`🤖 Bot może używać slash commands: ${canUseCommands}`);
                console.log(`🤖 Bot może zarządzać komendami: ${canManageCommands}`);
                
                // Sprawdź czy serwer ma ograniczenia slash commands
                const everyoneRole = guild.roles.everyone;
                console.log(`👥 @everyone może używać slash commands: ${everyoneRole.permissions.has('UseApplicationCommands')}`);
                
                // Sprawdź czy bot ma wyższe uprawnienia niż @everyone
                console.log(`🎭 Pozycja roli bota: ${botMember.roles.highest.position}`);
                console.log(`🎭 Pozycja @everyone: ${everyoneRole.position}`);
            }
        } catch (permError) {
            console.log('⚠️ Błąd sprawdzania uprawnień:', permError.message);
        }
        console.log('=== KONIEC SPRAWDZANIA UPRAWNIEŃ ===\n');
        
    } catch (error) {
        console.error('❌ Błąd rejestracji komend:', error);
        console.error('❌ Stack trace:', error.stack);
        
        // Spróbuj ponownie za 10 sekund
        console.log('🔄 Próbuję ponownie za 10 sekund...');
        setTimeout(registerCommands, 10000);
    }
}

// Wydarzenie gdy bot się uruchomi
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} jest online!`);
    console.log(`🔗 Zalogowany na ${client.guilds.cache.size} serwer(ach)`);
    console.log(`🕐 Czas uruchomienia: ${new Date().toISOString()}`);
    console.log(`🖥️ Środowisko: ${process.env.NODE_ENV || 'development'}`);
    
    // SPRAWDŹ UPRAWNIENIA BOTA NA SERWERZE
    const guild = client.guilds.cache.first();
    if (guild) {
        const botMember = guild.members.me;
        console.log('\n🔍 === SPRAWDZANIE UPRAWNIEŃ BOTA ===');
        console.log(`🏠 Serwer: ${guild.name} (${guild.id})`);
        console.log(`🤖 Bot: ${botMember.user.tag} (${botMember.id})`);
        console.log(`👑 Właściciel serwera: ${guild.ownerId}`);
        console.log(`🎭 Najwyższa rola bota: ${botMember.roles.highest.name} (pozycja: ${botMember.roles.highest.position})`);
        console.log(`⚡ Uprawnienia bota:`);
        
        const importantPermissions = [
            'Administrator',
            'ManageGuild', 
            'ManageRoles',
            'ManageNicknames',
            'SendMessages',
            'UseApplicationCommands',
            'ManageMessages'
        ];
        
        importantPermissions.forEach(perm => {
            const has = botMember.permissions.has(perm);
            console.log(`   ${has ? '✅' : '❌'} ${perm}: ${has}`);
        });
        
        console.log(`📊 Wszystkie uprawnienia: ${botMember.permissions.toArray().join(', ')}`);
        console.log('=== KONIEC SPRAWDZANIA UPRAWNIEŃ ===\n');
        
        // SPRAWDŹ INTEGRACJE SERWERA
        try {
            const integrations = await guild.fetchIntegrations();
            console.log(`🔗 Integrations na serwerze: ${integrations.size}`);
            integrations.forEach(integration => {
                if (integration.application && integration.application.id === client.user.id) {
                    console.log(`🤖 Znaleziono integrację bota: ${integration.application.name}`);
                    console.log(`   ID: ${integration.id}`);
                    console.log(`   Typ: ${integration.type}`);
                    console.log(`   Enabled: ${integration.enabled}`);
                }
            });
        } catch (intError) {
            console.log('⚠️ Nie można sprawdzić integrations:', intError.message);
        }
    }
    
    // Poczekaj 3 sekundy na pełne załadowanie się bota
    console.log('⏳ Czekam 3 sekundy na pełne załadowanie bota...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Rejestruj komendy slash
    await registerCommands();
    
    // Uruchom system codziennych przypomnień
    startDailyReminders();
    
    console.log('🚀 Bot w pełni gotowy do pracy!');
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

// Zabezpieczenie przed podwójnym wykonaniem komend - ULEPSZONE
const processedInteractions = new Set();
const sosCommandCooldown = new Set(); // Specjalny cooldown dla komendy SOS

// Obsługa komend slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    // DEBUGGING KAŻDEJ INTERAKCJI
    console.log(`🎯 DEBUG INTERAKCJA: ${interaction.user.tag} użył komendy /${interaction.commandName}`);
    console.log(`🎯 DEBUG: Guild: ${interaction.guild.name} (${interaction.guild.id})`);
    console.log(`🎯 DEBUG: Channel: ${interaction.channel.name} (${interaction.channel.id})`);
    console.log(`🎯 DEBUG: User permissions:`, interaction.member.permissions.toArray().join(', '));
    
    // Specjalne zabezpieczenie dla komendy SOS
    if (interaction.commandName === 'sos') {
        const cooldownKey = `${interaction.user.id}-sos`;
        
        if (sosCommandCooldown.has(cooldownKey)) {
            console.log(`🔍 DEBUG: Komenda SOS w cooldown dla ${interaction.user.tag} - pomijam`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '⏰ Please wait a moment before using this command again.',
                    ephemeral: true
                });
            }
            return;
        }
        
        // Dodaj do cooldown na 5 sekund
        sosCommandCooldown.add(cooldownKey);
        setTimeout(() => {
            sosCommandCooldown.delete(cooldownKey);
        }, 5000);
    }
    
    // Standardowe zabezpieczenie przed podwójnym wykonaniem
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

                // Przygotowanie wiadomości powitalnej
                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#dd3abc')
                    .setDescription(`<a:3729_Little_Pretty_Star_Pink:889208329321201674> Hello {user} on the Stable of Souls server! 👋\n\nWe are thrilled to have you join us! To get started, please read the rules <#1241676404605583401> and verify yourself in the <#1241675864362586192> to gain full access to the server. <@&1270346690421976055>!`);
                
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
            
            // Natychmiastowa odpowiedź, żeby uniknąć timeoutu
            await interaction.reply({
                content: '🔄 Sending verification reminder...',
                ephemeral: true
            });
            
            // Wysłanie manualnego przypomnienia
            const success = await sendVerificationReminder(interaction.guild, true);
            
            console.log(`📥 DEBUG: Przypomnienie wysłane, sukces: ${success}`);
            
            // Edytowanie odpowiedzi z wynikiem
            if (success) {
                console.log(`✅ DEBUG: Edytuję odpowiedź na sukces...`);
                await interaction.editReply({
                    content: '✅ Verification reminder sent successfully!'
                });
                console.log(`✅ DEBUG: Wyedytowałem odpowiedź`);
            } else {
                await interaction.editReply({
                    content: '❌ Failed to send verification reminder. Check bot permissions and channel ID.'
                });
            }
            
        } catch (error) {
            console.error('❌ Błąd przy wysyłaniu manualnego przypomnienia:', error);
            
            // Sprawdź czy już nie odpowiedział
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ An error occurred while sending the reminder.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('❌ Błąd przy odpowiedzi:', replyError);
                }
            } else {
                try {
                    await interaction.editReply({
                        content: '❌ An error occurred while sending the reminder.'
                    });
                } catch (editError) {
                    console.error('❌ Błąd przy edycji odpowiedzi:', editError);
                }
            }
        }
    }

    if (interaction.commandName === 'verify') {
        console.log(`🎯 DEBUG: Użytkownik ${interaction.user.tag} użył komendy /${interaction.commandName}`);
        console.log(`🎯 DEBUG: Czy to admin: ${interaction.member.permissions.has('Administrator')}`);
        console.log(`🎯 DEBUG: Role użytkownika:`, interaction.member.roles.cache.map(r => `${r.name} (${r.id})`).join(', '));
        
        try {
            const ssoName = interaction.options.getString('sso_name');
            const nickname = interaction.options.getString('nickname');
            
            console.log(`📝 DEBUG: SSO Name: ${ssoName}, Nickname: ${nickname}`);
            
            // Tworzenie nowego nicku w formacie ✧ SSO Name ✧ Nickname
            const newNickname = `✧ ${ssoName} ✧ ${nickname}`;
            
            // ID ról do dodania i usunięcia
            const rolesToAdd = ['1241706227051008061', '1105549622056861898'];
            const rolesToRemove = ['1245065409040748644', '1245417870029230181'];
            const changeNickChannelId = '1274412232855257118';
            
            // Sprawdzenie czy nick nie jest za długi (maksymalnie 32 znaki)
            if (newNickname.length > 32) {
                console.log(`❌ DEBUG: Nick za długi: ${newNickname.length} znaków`);
                await interaction.reply({
                    content: '❌ Nickname is too long! Maximum 32 characters. Try shortening your character name or nickname.',
                    ephemeral: true
                });
                return;
            }
            
            const member = interaction.member;
            const botMember = interaction.guild.members.me;
            
            // DEBUGGING - sprawdzenie uprawnień - DOSTĘPNE DLA WSZYSTKICH
            console.log(`🔍 Debug - Sprawdzanie uprawnień (dostępne dla wszystkich):`);
            console.log(`🤖 Bot ma uprawnienia Administrator: ${botMember.permissions.has('Administrator')}`);
            console.log(`🤖 Bot ma uprawnienia ManageRoles: ${botMember.permissions.has('ManageRoles')}`);
            console.log(`🤖 Bot ma uprawnienia ManageNicknames: ${botMember.permissions.has('ManageNicknames')}`);
            console.log(`👤 Pozycja roli bota: ${botMember.roles.highest.position}`);
            console.log(`👤 Pozycja roli użytkownika: ${member.roles.highest.position}`);
            console.log(`🔄 Bot może zarządzać użytkownikiem: ${member.manageable}`);
            console.log(`👤 Użytkownik to admin: ${member.permissions.has('Administrator')}`);
            console.log(`👤 Użytkownik to owner: ${member.id === interaction.guild.ownerId}`);
            
            // Sprawdzenie czy użytkownik to właściciel serwera
            if (member.id === interaction.guild.ownerId) {
                console.log(`❌ DEBUG: Nie można zmienić nicku właściciela serwera`);
                await interaction.reply({
                    content: '❌ Cannot change the server owner\'s nickname. Please change your nickname manually or use an account that is not the server owner.',
                    ephemeral: true
                });
                return;
            }
            
            // Sprawdzenie czy bot może zarządzać tym użytkownikiem
            if (!member.manageable) {
                console.log(`❌ DEBUG: Bot nie może zarządzać tym użytkownikiem`);
                await interaction.reply({
                    content: '❌ Cannot manage your roles. You probably have a higher role than the bot. Please contact an administrator.',
                    ephemeral: true
                });
                return;
            }
            
            // Sprawdzenie czy bot ma podstawowe uprawnienia
            if (!botMember.permissions.has('ManageNicknames')) {
                console.log(`❌ DEBUG: Bot nie ma uprawnień ManageNicknames`);
                await interaction.reply({
                    content: '❌ Bot doesn\'t have permission to change nicknames. Please contact an administrator.',
                    ephemeral: true
                });
                return;
            }
            
            if (!botMember.permissions.has('ManageRoles')) {
                console.log(`❌ DEBUG: Bot nie ma uprawnień ManageRoles`);
                await interaction.reply({
                    content: '❌ Bot doesn\'t have permission to manage roles. Please contact an administrator.',
                    ephemeral: true
                });
                return;
            }
            
            // Zmiana nicku
            try {
                console.log(`🔄 DEBUG: Próbuje zmienić nick na: ${newNickname}`);
                await member.setNickname(newNickname);
                console.log(`✅ Zmieniono nick na: ${newNickname}`);
            } catch (nickError) {
                console.log(`❌ Błąd zmiany nicku:`, nickError);
                await interaction.reply({
                    content: '❌ Cannot change your nickname. Please check bot permissions or contact an administrator.',
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
            
        } catch (error) {
            console.error('❌ Błąd przy weryfikacji:', error);
            
            let errorMessage = '❌ An error occurred during verification. Please contact an administrator.';
            
            if (error.code === 50013) {
                errorMessage = '❌ Bot does not have permission to change your nickname or roles. Please contact an administrator.';
            }
            
            // Sprawdź czy już nie odpowiedział
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMessage,
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
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#dd3abc')
            .setDescription(`<a:3729_Little_Pretty_Star_Pink:889208329321201674> Hello <@${member.id}> on the Stable of Souls server! 👋\n\nWe are thrilled to have you join us! To get started, please read the rules <#1241676404605583401> and verify yourself in the <#1241675864362586192> to gain full access to the server. <@&1270346690421976055>!`);
        
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