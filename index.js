const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

// Konfiguracja bota
const config = {
    token: process.env.BOT_TOKEN,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    reminderChannelId: process.env.REMINDER_CHANNEL_ID || '1241675864362586192',
    unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID || '1245065409040748644',
    welcomeMessage: {
        title: '🇺🇸 Hello! {user} on the Stable of Souls server! 👋',
        description: 'We are thrilled to have you join us! To get started, please read the rules ✅ ▶ <#1241676404605583401> and verify yourself in the right channel to gain full access to the server.'
    }
};

// Tworzenie klienta bota
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Definicja komendy slash
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
    {
        name: 'verify',
        description: 'Verify yourself on the server',
        options: [
            {
                name: 'sso_name',
                description: 'Your character name from the game (e.g. Luca Wolfblanket)',
                type: 3,
                required: true
            },
            {
                name: 'nickname', 
                description: 'Your nickname (e.g. Kumi)',
                type: 3,
                required: true
            }
        ]
    },
    new SlashCommandBuilder()
        .setName('sos')
        .setDescription('Send a manual verification reminder (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('change')
        .setDescription('Zamień rolę użytkowników (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('wiadomosc')
        .setDescription('Wyslij wiadomosc jako bot')
        .addStringOption(option =>
            option.setName('tekst')
                .setDescription('Tresc wiadomosci')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('change')
        .setDescription('Zamień rolę użytkowników (Admin only)')
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
        
        await channel.send({
            content: `<@&${config.unverifiedRoleId}> 👋`,
            embeds: [reminderEmbed]
        });
        
        console.log(`📨 Wysłano ${isManual ? 'manualne' : 'automatyczne'} przypomnienie o weryfikacji`);
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
        const guildId = '845651993770721300';
        
        console.log('🔄 Rejestruję komendy...');
        
        // Wyczyść stare komendy
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
        
        // Rejestruj nowe komendy
        const registeredCommands = await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands },
        );
        
        console.log(`✅ Zarejestrowano ${registeredCommands.length} komend`);
        
    } catch (error) {
        console.error('❌ Błąd rejestracji komend:', error);
    }
}

// Wydarzenie gdy bot się uruchomi
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} jest online!`);
    
    // Rejestruj komendy
    await registerCommands();
    
    // Uruchom system codziennych przypomnień
    startDailyReminders();
    
    console.log('🚀 Bot gotowy do pracy!');
});

// System codziennych przypomnień weryfikacji
function startDailyReminders() {
    const scheduleNextReminder = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(async () => {
            const guild = client.guilds.cache.first();
            if (guild) {
                await sendVerificationReminder(guild, false);
            }
            scheduleNextReminder();
        }, timeUntilMidnight);
        
        const hoursUntil = Math.round(timeUntilMidnight / 1000 / 60 / 60);
        console.log(`⏰ Następne przypomnienie za: ${hoursUntil} godzin`);
    };
    
    scheduleNextReminder();
}

// Zabezpieczenie przed podwójnym wykonaniem
const processedInteractions = new Set();
const sosCommandCooldown = new Set();

// Obsługa komend slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    console.log(`🎯 ${interaction.user.tag} użył komendy /${interaction.commandName}`);
    
    // Zabezpieczenie SOS
    if (interaction.commandName === 'sos') {
        const cooldownKey = `${interaction.user.id}-sos`;
        if (sosCommandCooldown.has(cooldownKey)) {
            await interaction.reply({
                content: '⏰ Poczekaj chwilę przed użyciem tej komendy ponownie.',
                ephemeral: true
            });
            return;
        }
        sosCommandCooldown.add(cooldownKey);
        setTimeout(() => sosCommandCooldown.delete(cooldownKey), 5000);
    }
    
    // Standardowe zabezpieczenie
    if (processedInteractions.has(interaction.id)) return;
    processedInteractions.add(interaction.id);
    setTimeout(() => processedInteractions.delete(interaction.id), 5 * 60 * 1000);

    // KOMENDA TEST
    if (interaction.commandName === 'test') {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'welcome') {
            try {
                const welcomeChannel = interaction.guild.channels.cache.get(config.welcomeChannelId);
                
                if (!welcomeChannel) {
                    await interaction.reply({
                        content: '❌ Nie znaleziono kanału powitalnego!',
                        ephemeral: true
                    });
                    return;
                }

                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#dd3abc')
                    .setDescription(`<a:3729_Little_Pretty_Star_Pink:889208329321201674> Hello <@${interaction.user.id}> on the Stable of Souls server! 👋\n\nWe are thrilled to have you join us! To get started, please read the rules <#1241676404605583401> and verify yourself in the <#1241675864362586192> to gain full access to the server.`);
                
                await welcomeChannel.send({ embeds: [welcomeEmbed] });
                
                await interaction.reply({
                    content: `✅ Wysłano testową wiadomość powitalną!`,
                    ephemeral: true
                });
                
            } catch (error) {
                console.error('❌ Błąd testowania wiadomości powitalnej:', error);
                await interaction.reply({
                    content: '❌ Wystąpił błąd podczas wysyłania testowej wiadomości.',
                    ephemeral: true
                });
            }
        }
    }

    // KOMENDA SOS
    if (interaction.commandName === 'sos') {
        try {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({
                    content: '❌ Potrzebujesz uprawnień administratora.',
                    ephemeral: true
                });
                return;
            }
            
            await interaction.reply({
                content: '🔄 Wysyłam przypomnienie...',
                ephemeral: true
            });
            
            const success = await sendVerificationReminder(interaction.guild, true);
            
            await interaction.editReply({
                content: success ? '✅ Przypomnienie wysłane!' : '❌ Błąd wysyłania przypomnienia.'
            });
            
        } catch (error) {
            console.error('❌ Błąd komendy SOS:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Wystąpił błąd.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: '❌ Wystąpił błąd.'
                });
            }
        }
    }

    // KOMENDA VERIFY
    if (interaction.commandName === 'verify') {
        try {
            const ssoName = interaction.options.getString('sso_name');
            const nickname = interaction.options.getString('nickname');
            
            const newNickname = `✧ ${ssoName} ✧ ${nickname}`;
            
            const rolesToAdd = ['1241706227051008061', '1105549622056861898'];
            const rolesToRemove = ['1245065409040748644', '1245417870029230181'];
            const changeNickChannelId = '1274412232855257118';
            
            if (newNickname.length > 32) {
                await interaction.reply({
                    content: '❌ Nick jest za długi! Maksymalnie 32 znaki.',
                    ephemeral: true
                });
                return;
            }
            
            const member = interaction.member;
            const botMember = interaction.guild.members.me;
            
            if (member.id === interaction.guild.ownerId) {
                await interaction.reply({
                    content: '❌ Nie można zmienić nicku właściciela serwera.',
                    ephemeral: true
                });
                return;
            }
            
            if (!member.manageable) {
                await interaction.reply({
                    content: '❌ Bot nie może zarządzać twoimi rolami.',
                    ephemeral: true
                });
                return;
            }
            
            if (!botMember.permissions.has('ManageNicknames')) {
                await interaction.reply({
                    content: '❌ Bot nie ma uprawnień do zmiany nicków.',
                    ephemeral: true
                });
                return;
            }
            
            if (!botMember.permissions.has('ManageRoles')) {
                await interaction.reply({
                    content: '❌ Bot nie ma uprawnień do zarządzania rolami.',
                    ephemeral: true
                });
                return;
            }
            
            // Zmiana nicku
            try {
                await member.setNickname(newNickname);
            } catch (nickError) {
                await interaction.reply({
                    content: '❌ Nie można zmienić nicku.',
                    ephemeral: true
                });
                return;
            }
            
            // Zarządzanie rolami
            for (const roleId of rolesToAdd) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role && !member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.add(role);
                    } catch (roleError) {
                        console.error(`Błąd dodawania roli ${role.name}:`, roleError);
                    }
                }
            }
            
            for (const roleId of rolesToRemove) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.remove(role);
                    } catch (roleError) {
                        console.error(`Błąd usuwania roli ${role.name}:`, roleError);
                    }
                }
            }
            
            const verificationEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Weryfikacja zakończona pomyślnie!')
                .setDescription(`**Zweryfikowano jako:** ${newNickname}`)
                .addFields({
                    name: '📝 Potrzebujesz zmiany nicku?',
                    value: `Napisz na kanale <#${changeNickChannelId}>`,
                    inline: false
                })
                .setTimestamp();
            
            await interaction.reply({
                embeds: [verificationEmbed],
                ephemeral: true
            });
            
            setTimeout(async () => {
                try {
                    await interaction.deleteReply();
                } catch (err) {
                    // Ignoruj błąd
                }
            }, 15000);
            
        } catch (error) {
            console.error('❌ Błąd weryfikacji:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Wystąpił błąd podczas weryfikacji.',
                    ephemeral: true
                });
            }
        }
    }

    // KOMENDA WIADOMOSC
    if (interaction.commandName === 'wiadomosc') {
        try {
            const tekst = interaction.options.getString('tekst');
            
            if (!interaction.channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
                await interaction.reply({
                    content: '❌ Bot nie ma uprawnień do wysyłania wiadomości.',
                    ephemeral: true
                });
                return;
            }
            
            await interaction.reply({
                content: '✅ Wysyłam wiadomość...',
                ephemeral: true
            });
            
            await interaction.channel.send(tekst);
            
            await interaction.editReply({
                content: '✅ Wiadomość wysłana!'
            });
            
        } catch (error) {
            console.error('❌ Błąd wysyłania wiadomości:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Błąd podczas wysyłania.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: '❌ Błąd podczas wysyłania.'
                });
            }
        }
    }

    // KOMENDA CHANGE
    if (interaction.commandName === 'change') {
        try {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({
                    content: '❌ Potrzebujesz uprawnień administratora.',
                    ephemeral: true
                });
                return;
            }
            
            const oldRoleId = '1105549722753708072';
            const newRoleId = '1105549622056861898';
            
            const oldRole = interaction.guild.roles.cache.get(oldRoleId);
            const newRole = interaction.guild.roles.cache.get(newRoleId);
            
            if (!oldRole) {
                await interaction.reply({
                    content: `❌ Nie znaleziono starej roli (ID: ${oldRoleId})`,
                    ephemeral: true
                });
                return;
            }
            
            if (!newRole) {
                await interaction.reply({
                    content: `❌ Nie znaleziono nowej roli (ID: ${newRoleId})`,
                    ephemeral: true
                });
                return;
            }
            
            const membersWithOldRole = interaction.guild.members.cache.filter(member => 
                member.roles.cache.has(oldRoleId)
            );
            
            if (membersWithOldRole.size === 0) {
                await interaction.reply({
                    content: `❌ Nie znaleziono użytkowników z rolą "${oldRole.name}"`,
                    ephemeral: true
                });
                return;
            }
            
            await interaction.reply({
                content: `🔄 Zmienianie roli dla ${membersWithOldRole.size} użytkowników...\nStara rola: "${oldRole.name}"\nNowa rola: "${newRole.name}"`,
                ephemeral: true
            });
            
            let successCount = 0;
            let failCount = 0;
            
            for (const [memberId, member] of membersWithOldRole) {
                try {
                    await member.roles.remove(oldRole);
                    await member.roles.add(newRole);
                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (roleError) {
                    failCount++;
                    console.error(`Błąd zmiany roli dla ${member.user.tag}:`, roleError.message);
                }
            }
            
            await interaction.editReply({
                content: `✅ **Zmiana ról zakończona!**\n\n` +
                        `📊 **Statystyki:**\n` +
                        `• Pomyślne zmiany: ${successCount}\n` +
                        `• Niepowodzenia: ${failCount}\n` +
                        `• Łącznie przetworzonych: ${membersWithOldRole.size}\n\n` +
                        `🔄 **Zmiana:** "${oldRole.name}" → "${newRole.name}"`
            });
            
        } catch (error) {
            console.error('❌ Błąd komendy change:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Wystąpił błąd podczas zmiany ról.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: '❌ Wystąpił błąd podczas zmiany ról.'
                });
            }
        }
    }

    if (interaction.commandName === 'change') {
        console.log(`🔄 DEBUG: Użytkownik ${interaction.user.tag} użył komendy /change`);
        
        try {
            // Sprawdzenie uprawnień administratora
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({
                    content: '❌ Potrzebujesz uprawnień administratora do użycia tej komendy.',
                    ephemeral: true
                });
                return;
            }
            
            const oldRoleId = '1105549722753708072'; // Stara rola do usunięcia
            const newRoleId = '1105549622056861898'; // Nowa rola do dodania
            
            // Znajdź role
            const oldRole = interaction.guild.roles.cache.get(oldRoleId);
            const newRole = interaction.guild.roles.cache.get(newRoleId);
            
            if (!oldRole) {
                await interaction.reply({
                    content: `❌ Nie znaleziono starej roli (ID: ${oldRoleId})`,
                    ephemeral: true
                });
                return;
            }
            
            if (!newRole) {
                await interaction.reply({
                    content: `❌ Nie znaleziono nowej roli (ID: ${newRoleId})`,
                    ephemeral: true
                });
                return;
            }
            
            // Znajdź wszystkich użytkowników ze starą rolą
            const membersWithOldRole = interaction.guild.members.cache.filter(member => 
                member.roles.cache.has(oldRoleId)
            );
            
            if (membersWithOldRole.size === 0) {
                await interaction.reply({
                    content: `❌ Nie znaleziono użytkowników z rolą "${oldRole.name}"`,
                    ephemeral: true
                });
                return;
            }
            
            // Odpowiedz na interakcję
            await interaction.reply({
                content: `🔄 Zmienianie roli dla ${membersWithOldRole.size} użytkowników...\nStara rola: "${oldRole.name}"\nNowa rola: "${newRole.name}"`,
                ephemeral: true
            });
            
            let successCount = 0;
            let failCount = 0;
            
            // Zmień role dla każdego użytkownika
            for (const [memberId, member] of membersWithOldRole) {
                try {
                    // Usuń starą rolę i dodaj nową
                    await member.roles.remove(oldRole);
                    await member.roles.add(newRole);
                    
                    successCount++;
                    console.log(`✅ Zmieniono rolę dla ${member.user.tag}`);
                    
                    // Małe opóźnienie żeby nie przekroczyć rate limits Discord
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (roleError) {
                    failCount++;
                    console.error(`❌ Błąd zmiany roli dla ${member.user.tag}:`, roleError.message);
                }
            }
            
            // Edytuj odpowiedź z wynikami
            await interaction.editReply({
                content: `✅ **Zmiana ról zakończona!**\n\n` +
                        `📊 **Statystyki:**\n` +
                        `• Pomyślne zmiany: ${successCount}\n` +
                        `• Niepowodzenia: ${failCount}\n` +
                        `• Łącznie przetworzonych: ${membersWithOldRole.size}\n\n` +
                        `🔄 **Zmiana:** "${oldRole.name}" → "${newRole.name}"`
            });
            
            console.log(`🔄 ${interaction.user.tag} zmienił role: ${successCount} sukces, ${failCount} błędów`);
            
        } catch (error) {
            console.error('❌ Błąd komendy change:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Wystąpił błąd podczas zmiany ról.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: '❌ Wystąpił błąd podczas zmiany ról.'
                });
            }
        }
    }
});

// Wydarzenie gdy ktoś dołączy na serwer
client.on('guildMemberAdd', async (member) => {
    try {
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
        
        if (!welcomeChannel) {
            console.log('❌ Nie znaleziono kanału powitalnego!');
            return;
        }

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#dd3abc')
            .setDescription(`<a:3729_Little_Pretty_Star_Pink:889208329321201674> Hello <@${member.id}> on the Stable of Souls server! 👋\n\nWe are thrilled to have you join us! To get started, please read the rules <#1241676404605583401> and verify yourself in the <#1241675864362586192> to gain full access to the server.`);
        
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