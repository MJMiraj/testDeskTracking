const appCategories = {'github.com':'productive','github.io':'productive','gitlab.com':'productive','bitbucket.org':'productive','vscode':'productive','code.exe':'productive','idea64.exe':'productive','webstorm64.exe':'productive','pycharm64.exe':'productive','studio64.exe':'productive','devenv.exe':'productive','sublime_text.exe':'productive','notepad++.exe':'productive','vim':'productive','nvim':'productive','xcode':'productive','photoshop.exe':'productive','illustrator.exe':'productive','indesign.exe':'productive','xd.exe':'productive','premiere.exe':'productive','afterfx.exe':'productive','coreldrw.exe':'productive','designer.exe':'productive','photo.exe':'productive','blender.exe':'productive','cinema4d.exe':'productive','sketch':'productive','figma':'productive','miro.com':'productive','lucidchart.com':'productive','invisionapp.com':'productive','behance.net':'productive','dribbble.com':'productive','postman.com':'productive','mongodb.com':'productive','aws.amazon.com':'productive','cloud.google.com':'productive','azure.microsoft.com':'productive','stackoverflow.com':'productive','chatgpt.com':'productive','slack.com':'productive','notion.so':'productive','jira.com':'productive','confluence.com':'productive','trello.com':'productive','asana.com':'productive','linear.app':'productive','mail.google.com':'neutral','outlook.com':'neutral','calendar.google.com':'neutral','zoom.us':'neutral','meet.google.com':'neutral','teams.microsoft.com':'neutral','webex.com':'neutral','skype.com':'neutral','drive.google.com':'neutral','dropbox.com':'neutral','box.com':'neutral','canva.com':'neutral','whatsapp.com':'neutral','spotify.com':'neutral','apple.com':'neutral','microsoft.com':'neutral','youtube.com':'unproductive','twitch.tv':'unproductive','vimeo.com':'unproductive','netflix.com':'unproductive','hulu.com':'unproductive','disneyplus.com':'unproductive','facebook.com':'unproductive','twitter.com':'unproductive','instagram.com':'unproductive','reddit.com':'unproductive','tiktok.com':'unproductive','pinterest.com':'unproductive','tumblr.com':'unproductive','9gag.com':'unproductive','amazon.com':'unproductive','ebay.com':'unproductive','aliexpress.com':'unproductive'};

const categorizeAppDynamic = (windowTitle) => {
    if (!windowTitle) return { category: 'Neutral', matchedApp: null };
    const title = windowTitle.toLowerCase();
    for (const [keyword, category] of Object.entries(appCategories)) {
        const cleanKeyword = keyword.toLowerCase().replace(/\.(com|org|net|io|co|us|tv|app|exe)$/, '');
        if (title.includes(cleanKeyword)) {
            return { category: category.charAt(0).toUpperCase() + category.slice(1), matchedApp: keyword };
        }
    }
    return { category: 'Neutral', matchedApp: null };
};

const titles = [
    'Google Chrome',
    'Windows Explorer',
    'Slack - general',
    'Visual Studio Code',
    'Spotify Premium',
    'Terminal',
    'Untitled - Notepad',
    'Task Manager',
    'Zoom Meeting',
    'Inbox (1) - mdmiraj.paperles@gmail.com - Gmail',
    'YouTube - Google Chrome',
    'Facebook - Google Chrome',
    'React App - Google Chrome',
    'Command Prompt',
    'File Explorer'
];

titles.forEach(t => console.log(t, '->', categorizeAppDynamic(t)));
