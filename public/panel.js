
  'use strict';

  const I18N = {
    fa: {
      appName: 'پنل مدیریت ربات', appShort: 'BotPanel', poweredBy: 'قدرت‌گرفته از Cloudflare Workers',
      loginSub: 'برای مدیریت ربات وارد شوید', loginEveryEntry: 'به‌دلیل امنیت، رمز عبور در هر بار ورود به پنل درخواست می‌شود.', password: 'رمز عبور', passwordPh: '••••••••',
      support: 'پشتیبانی', msgTab: 'پیام متنی', pollTab: 'نظرسنجی', photoTab: 'عکس و فایل', resultsTab: 'نتایج و آمار',
      targetUsers: 'کاربران خاص', targetChat: 'کانال / گروه', usersIdsPh: 'آیدی‌های عددی با کاما — مثال: 11111111, 22222222',
      chatIdPh2: 'آیدی چت — کانال: ‎-100…، گروه: ‎-…', question: 'سؤال نظرسنجی', questionPh: 'مثلاً: کدام گزینه را می‌پسندید؟',
      addOpt: '+ افزودن گزینه', optPh: 'گزینه…', pollHint: 'با کلیک کاربران، اعداد و نمودارها به‌صورت زنده بروزرسانی می‌شوند',
      photoUrl: 'لینک مستقیم عکس', photoUrlPh: 'https://example.com/photo.jpg', captionPh: 'کپشن عکس (اختیاری)',
      withReactions: 'افزودن دکمه‌های لایک / دیسلایک', photoHint: 'لینک باید مستقیم و عمومی باشد (jpg/png/gif) — شمارش لایک‌ها زنده است',
      directSent: 'ارسال فوری انجام شد', directPart: 'ارسال انجام شد اما برخی ناموفق بودند',
      pollsList: 'نظرسنجی‌های اخیر', postsList: 'پست‌های اخیر', noPolls: 'هنوز نظرسنجی‌ای ارسال نشده',
      noPosts: 'هنوز پستی ارسال نشده', votes: 'رأی',
      supHint: 'پیام‌های کاربران از دستور /support ربات اینجا می‌رسند؛ پاسخ بدهید تا در تلگرامشان تحویل بگیرند.',
      noTickets: 'تیکتی وجود ندارد', open: 'باز', closed: 'بسته', replyPh: 'پاسخ خود را بنویسید…',
      sendReply: 'ارسال پاسخ', closeTicket: 'بستن تیکت', ticketClosed: 'تیکت بسته شد', delivered: 'تحویل‌شده',
      notDelivered: 'ثبت شد (ارسال به تلگرام ناموفق)', adminLbl: 'پشتیبانی', invalidForm: 'فرم را کامل کنید',
      submenus: 'زیرمنوها', subNew: '+ ساخت زیرمنو جدید', subEdit: 'ویرایش زیرمنو', subTitle: 'عنوان صفحه', subText: 'متن صفحه',
      subHint: 'دکمه‌های نوع «زیرمنو» این صفحه را باز می‌کنند. دکمه «بازگشت» خودکار است و زیرمنوها می‌توانند به هم لینک شوند (چندلایه).',
      typeSubmenu: 'زیرمنو', typeText: 'پاپ‌آپ متن', valSubmenu: 'انتخاب زیرمنو', valText: 'متن پاپ‌آپ (تا ۲۰۰ کاراکتر)',
      backToMain: 'دکمه‌های صفحه اصلی', subDelConfirm: 'این زیرمنو حذف شود؟ دکمه‌هایی که به آن لینک هستند هم پاک می‌شوند.',
      rowLbl: 'ردیف', colLbl: 'جایگاه در ردیف (شماره ستون)', newRowOpt: 'ردیف جدید',
      addBtnTitle: 'افزودن دکمه شیشه‌ای', btnsCount: 'دکمه', pageBtns: 'دکمه‌های این صفحه', backToList: 'بازگشت به فهرست زیرمنوها',
      endOfRow: 'آخر ردیف', posHint: 'ستون ۱ = اولین جایگاه ردیف؛ خالی بگذارید تا در انتهای ردیف اضافه شود (حداکثر ۱۰ ردیف و ۸ دکمه در هر ردیف)',
      moveL: 'یک جای به عقب', moveR: 'یک جای به جلو', moveU: 'انتقال به ردیف بالاتر', moveD: 'انتقال به ردیف پایین‌تر',
      channelLock: 'قفل کانال (عضویت اجباری)', chEnable: 'فعال‌سازی — کاربر تا عضو کانال نشود ربات فعال نمی‌شود',
      chId: 'آیدی کانال — مثلاً @mychannel یا -1001234567890', chUrl: 'لینک دعوت سفارشی (اختیاری)',
      chHint: 'ربات باید ادمین کانال باشد تا عضویت را تشخیص دهد.',
      signIn: 'ورود', signingIn: 'در حال ورود…', loginErr: 'رمز عبور نادرست است',
      rateLimited: 'تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید', fillPassword: 'رمز عبور را وارد کنید',
      freeTierLimit: 'سهمیهٔ روزانهٔ پلن رایگان Cloudflare تمام شده است؛ پنل و ربات ساعت ۰۰:۰۰ UTC (۰۳:۳۰ تهران) خودبه‌خود برمی‌گردند.',
      defPwHint: 'رمز ورود اولیه: <b>botpanel123</b> — بدون نیاز به متغیر؛ در اولین ورود، رمز خصوصی خود را داخل پنل تعیین کنید.',
      security: 'امنیت و رمز عبور', currentPw: 'رمز فعلی', newPw: 'رمز جدید', newPw2: 'تکرار رمز جدید',
      changePw: 'تغییر رمز عبور', pwChanged: 'رمز عبور تغییر کرد', pwMinLen: 'رمز جدید باید حداقل ۶ کاراکتر باشد',
      pwNoMatch: 'رمزهای جدید یکسان نیستند', wrongPw: 'رمز فعلی نادرست است',
      sessionsNote: 'پس از تغییر رمز، همه دستگاه‌های دیگر از حساب خارج می‌شوند (جز همین نشست).',
      forgotPw: 'فراموشی رمز',
      relogin: 'نشست منقضی شد؛ دوباره وارد شوید',
      dashboard: 'داشبورد', users: 'کاربران', broadcast: 'ارسال همگانی', menuBuilder: 'منو و دکمه‌ها', settings: 'تنظیمات',
      logout: 'خروج', confirmLogout: 'از پنل خارج می‌شوید؟',
      save: 'ذخیره', saved: 'ذخیره شد', cancel: 'انصراف', close: 'بستن', confirm: 'تایید', remove: 'حذف',
      saveAllBtn: 'ذخیره همه تغییرات', allSaved: 'تمامی تغییرات ذخیره شدند', unsavedHint: 'تغییرات ذخیره‌نشده دارید', savingAll: 'در حال ذخیره…', saveFailed: 'ذخیره انجام نشد',
      refresh: 'بروزرسانی', loading: 'در حال بارگذاری…', none: '—', send: 'ارسال', sending: 'در حال ارسال…',
      errorGeneric: 'خطایی رخ داد', copy: 'کپی', copied: 'کپی شد',
      liveStatus: 'وضعیت لحظه‌ای ورکر', operational: 'فعال', offline: 'قطع', latency: 'تأخیر',
      lastCheck: 'آخرین بررسی', region: 'مرکز داده', checkNow: 'بررسی فوری',
      totalUsers: 'کل کاربران', bannedUsers: 'کاربران مسدود', messagesProcessed: 'پیام‌های پردازش‌شده',
      broadcastsCreated: 'ارسال‌های همگانی', messagesSent: 'پیام‌های ارسال‌شده',
      webhookStatus: 'وضعیت وب‌هوک تلگرام', notConfigured: 'تنظیم نشده', pendingUpdates: 'آپدیت‌های در انتظار',
      lastError: 'آخرین خطا', recentUsers: 'کاربران اخیر', quickActions: 'دسترسی سریع',
      goSettings: 'رفتن به تنظیمات', noUsersYet: 'هنوز کاربری ثبت نشده', botConfigured: 'ربات پیکربندی نشده است',
      searchUsers: 'جستجوی نام، یوزرنیم یا آیدی…', perPage: 'در صفحه', id: 'آیدی', user: 'کاربر',
      lang: 'زبان', status: 'وضعیت', joined: 'عضویت', actions: 'عملیات', active: 'فعال', inactive: 'غیرفعال',
      banned: 'مسدود', blockedBot: 'بات را بلاک کرده', noUsersFound: 'کاربری یافت نشد',
      banUser: 'مسدودسازی', unbanUser: 'آزادسازی', banQ: 'این کاربر مسدود شود؟ (ربات پیامش را نادیده می‌گیرد)',
      banReason: 'دلیل (اختیاری)', sendMessage: 'ارسال پیام', userDetails: 'جزئیات کاربر',
      firstName: 'نام', username: 'یوزرنیم', lastSeen: 'آخرین فعالیت', bannedAt: 'زمان مسدودی', reason: 'دلیل',
      messageText: 'متن پیام', msgSent: 'پیام ارسال شد', page: 'صفحه', next: 'بعدی', prev: 'قبلی',
      newBroadcast: 'ارسال پیام همگانی جدید', target: 'مخاطبان', allUsers: 'همه کاربران (غیرمسدود)',
      active7d: 'فعال در ۷ روز گذشته', active30d: 'فعال در ۳۰ روز گذشته', parseMode: 'فرمت متن',
      plain: 'متن ساده', addUrlRow: 'افزودن ردیف دکمه', addBtn: '+ دکمه', btnText: 'متن دکمه',
      btnUrl: 'لینک (https://…)', startBroadcast: 'شروع ارسال', progress: 'پیشرفت', sentLabel: 'ارسال‌شده',
      failedLabel: 'ناموفق', totalLabel: 'مجموع', pause: 'توقف موقت', resume: 'ادامه', stop: 'توقف قطعی',
      confirmStop: 'ارسال همگانی متوقف شود؟', broadcastHistory: 'تاریخچه ارسال', noHistory: 'سابقه‌ای موجود نیست',
      running: 'در حال ارسال', paused: 'متوقف موقت', stopped: 'متوقف‌شده', done: 'تکمیل‌شده', failed: 'ناموفق',
      createdAt: 'ایجاد', chars: 'کاراکتر', targetHint: 'کاربران مسدود و افرادی که ربات را بلاک کرده‌اند به‌صورت خودکار حذف می‌شوند',
      noTargets: 'کاربر هدفی یافت نشد',
      menuHint: 'پیکربندی پیام‌ها، کیبورد اصلی و دکمه‌های شیشه‌ای ربات', welcomeTab: 'پیام خوش‌آمد',
      inlineTab: 'دکمه‌های شیشه‌ای',
      welcomeFa: 'متن فارسی (/start)', welcomeEn: 'متن انگلیسی (/start)', helpFa: 'راهنمای فارسی (/help)', helpEn: 'راهنمای انگلیسی (/help)',
      tplHint: 'متغیرها: {name} نام، {username} یوزرنیم، {id} آیدی',
      btnType: 'نوع', typeUrl: 'لینک', typeCallback: 'کال‌بک', value: 'مقدار', valueUrl: 'https://…', valueCb: 'مثلاً my:action (حداکثر ۶۴ بایت)',
      cbTooLong: 'مقدار کال‌بک حداکثر ۶۴ بایت است؛ هر حرف فارسی ۲ بایت حساب می‌شود. مقدار کوتاه‌تری بنویسید.',
      cbTrimmed: 'مقدار کال‌بک به ۶۴ بایت کوتاه شد تا ربات بتواند دکمه را بسازد.',
      resetDefaults: 'بازنشانی به پیش‌فرض',
      confirmReset: 'منو به حالت پیش‌فرض بازگردانده شود؟',
      botSettings: 'تنظیمات ربات', botToken: 'توکن ربات', tokenStored: 'توکن ذخیره‌شده:',
      tokenHint: 'از @BotFather دریافت می‌شود. خالی بگذارید تا تغییر نکند.', tokenMissingWarn: 'هنوز توکنی تنظیم نشده است',
      defaultBotLang: 'زبان پیش‌فرض (کاربران جدید)', broadcastTuning: 'تیونینگ ارسال همگانی',
      botLang: 'زبان ربات', langBoth: 'دوزبانه (فارسی + English)', langFaOnly: 'تک‌زبانه — فقط فارسی',
      langEnOnly: 'تک‌زبانه — فقط English', defLangHint: 'زبان اولیه کاربران جدید — فقط در حالت دوزبانه کاربرد دارد',
      supportAlways: 'نمایش خودکار دکمه پشتیبانی در همه صفحات منو', sbFaPh: 'متن دکمه (فارسی)', sbEnPh: 'متن دکمه (English)',
      batchSize: 'حجم هر دسته (۱ تا ۵۰)', delayMs: 'فاصله بین پیام‌ها (میلی‌ثانیه)',
      webhookMgmt: 'مدیریت وب‌هوک', setWebhook: 'تنظیم وب‌هوک', delWebhook: 'حذف وب‌هوک',
      confirmDelWh: 'وب‌هوک حذف شود؟ ربات پیام‌ها را دریافت نخواهد کرد.',
      webhookSetOk: 'وب‌هوک با موفقیت تنظیم شد', webhookDelOk: 'وب‌هوک حذف شد',
      webhookWarnTitle: 'هشدار: وب‌هوک تنظیم نشده است',
      webhookWarnBody: 'توکن و آیدی عددی ذخیره شد، اما تا زمانی که از بخش «مدیریت وب‌هوک» دکمه «تنظیم وب‌هوک» را نزنید، ربات هیچ پیامی دریافت نمی‌کند و کار نخواهد کرد.',
      webhookGoSet: 'رفتن به مدیریت وب‌هوک',
      webhookNeeded: 'برای فعال شدن ربات، ابتدا وب‌هوک را تنظیم کنید — در غیر این صورت ربات کار نمی‌کند.',
      panelPrefs: 'تنظیمات پنل', appearance: 'پوسته', dark: 'تیره', light: 'روشن', themeOcean: 'اقیانوس', themeViolet: 'بنفش', themeForest: 'جنگل', themeSunset: 'غروب', language: 'زبان',
      expandAll: 'باز کردن همه', collapseAll: 'بستن همه',
      startText: 'متن شروع (/start)', helpText: 'راهنما (/help)', recentHist: 'ارسال‌های اخیر',
      version: 'نسخه',
      creatorSupport: 'پشتیبانی سازنده', creatorChatTitle: 'گفتگو با سازنده پنل',
      creatorInputPh: 'پیام خود را برای سازنده بنویسید…', creatorSend: 'ارسال',
      creatorEmpty: 'هنوز پیامی رد و بدل نشده است.',
      updateTitle: 'به‌روزرسانی جدید', updateLater: 'بعداً به‌روزرسانی می‌کنم',
      updateDo: 'به‌روزرسانی', updateNever: 'دیگر این پیام را نشان نده',
      noticeTitle: 'پیام سازنده', noticeGotIt: 'متوجه شدم',
    },
    en: {
      appName: 'Bot Admin Panel', appShort: 'BotPanel', poweredBy: 'Powered by Cloudflare Workers',
      loginSub: 'Sign in to manage your bot', loginEveryEntry: 'For security, your password is required every time you open the panel.', password: 'Password', passwordPh: '••••••••',
      support: 'Support', msgTab: 'Text message', pollTab: 'Poll', photoTab: 'Photo & file', resultsTab: 'Results & stats',
      targetUsers: 'Specific users', targetChat: 'Channel / Group', usersIdsPh: 'Numeric IDs, comma-separated — e.g. 11111111, 22222222',
      chatIdPh2: 'Chat ID — channel: -100…, group: -…', question: 'Poll question', questionPh: 'e.g. Which option do you prefer?',
      addOpt: '+ Add option', optPh: 'Option…', pollHint: 'Counts and bars update live as users vote',
      photoUrl: 'Direct photo URL', photoUrlPh: 'https://example.com/photo.jpg', captionPh: 'Photo caption (optional)',
      withReactions: 'Add like / dislike buttons', photoHint: 'URL must be direct and public (jpg/png/gif) — like counts are live',
      directSent: 'Sent immediately', directPart: 'Sent, but some deliveries failed',
      pollsList: 'Recent polls', postsList: 'Recent posts', noPolls: 'No polls sent yet',
      noPosts: 'No posts sent yet', votes: 'votes',
      supHint: 'Messages sent via /support in the bot arrive here; reply and they are delivered in the user’s Telegram.',
      noTickets: 'No tickets', open: 'Open', closed: 'Closed', replyPh: 'Write your reply…',
      sendReply: 'Send reply', closeTicket: 'Close ticket', ticketClosed: 'Ticket closed', delivered: 'Delivered',
      notDelivered: 'Saved (Telegram delivery failed)', adminLbl: 'Support', invalidForm: 'Please complete the form',
      submenus: 'Submenus', subNew: '+ New submenu', subEdit: 'Edit submenu', subTitle: 'Page title', subText: 'Page text',
      subHint: 'Buttons of type “submenu” open this page. A back button is added automatically and submenus can link to each other (multi-level).',
      typeSubmenu: 'Submenu', typeText: 'Text popup', valSubmenu: 'Choose submenu', valText: 'Popup text (up to 200 chars)',
      backToMain: 'Main-page buttons', subDelConfirm: 'Delete this submenu? Buttons linking to it will be removed too.',
      rowLbl: 'Row', colLbl: 'Position in row (column #)', newRowOpt: 'New row',
      addBtnTitle: 'Add inline button', btnsCount: 'buttons', pageBtns: 'Buttons of this page', backToList: 'Back to submenu list',
      endOfRow: 'End of row', posHint: 'Column 1 = first slot of the row; leave empty to append at the end (max 10 rows, 8 buttons per row)',
      moveL: 'Move back one slot', moveR: 'Move forward one slot', moveU: 'Move to the row above', moveD: 'Move to the row below',
      channelLock: 'Channel lock (force-subscribe)', chEnable: 'Enable — the bot stays locked until the user joins',
      chId: 'Channel ID — e.g. @mychannel or -1001234567890', chUrl: 'Custom invite link (optional)',
      chHint: 'The bot must be an admin of the channel to detect membership.',
      signIn: 'Sign in', signingIn: 'Signing in…', loginErr: 'Incorrect password',
      rateLimited: 'Too many attempts; try again in a few minutes', fillPassword: 'Please enter the password',
      freeTierLimit: 'Cloudflare\'s free-plan daily allowance is used up; the panel and the bot come back by themselves at 00:00 UTC.',
      defPwHint: 'Initial password: <b>botpanel123</b> — no environment variable required. Set your private password on first login.',
      security: 'Security & password', currentPw: 'Current password', newPw: 'New password', newPw2: 'Repeat new password',
      changePw: 'Change password', pwChanged: 'Password changed', pwMinLen: 'New password must be at least 6 characters',
      pwNoMatch: 'New passwords do not match', wrongPw: 'Current password is incorrect',
      sessionsNote: 'After changing the password, all other devices are signed out (except this session).',
      forgotPw: 'Forgot password',
      relogin: 'Session expired; please sign in again',
      dashboard: 'Dashboard', users: 'Users', broadcast: 'Broadcast', menuBuilder: 'Menus & Buttons', settings: 'Settings',
      logout: 'Log out', confirmLogout: 'Log out of the panel?',
      save: 'Save', saved: 'Saved', cancel: 'Cancel', close: 'Close', confirm: 'Confirm', remove: 'Remove',
      saveAllBtn: 'Save all changes', allSaved: 'All changes saved', unsavedHint: 'You have unsaved changes', savingAll: 'Saving…', saveFailed: 'Save failed',
      refresh: 'Refresh', loading: 'Loading…', none: '—', send: 'Send', sending: 'Sending…',
      errorGeneric: 'Something went wrong', copy: 'Copy', copied: 'Copied',
      liveStatus: 'Worker live status', operational: 'Operational', offline: 'Offline', latency: 'Latency',
      lastCheck: 'Last check', region: 'Data center', checkNow: 'Check now',
      totalUsers: 'Total users', bannedUsers: 'Banned users', messagesProcessed: 'Messages processed',
      broadcastsCreated: 'Broadcasts', messagesSent: 'Messages sent',
      webhookStatus: 'Telegram webhook status', notConfigured: 'Not configured', pendingUpdates: 'Pending updates',
      lastError: 'Last error', recentUsers: 'Recent users', quickActions: 'Quick actions',
      goSettings: 'Go to settings', noUsersYet: 'No users yet', botConfigured: 'Bot is not configured',
      searchUsers: 'Search name, username or ID…', perPage: 'Per page', id: 'ID', user: 'User',
      lang: 'Lang', status: 'Status', joined: 'Joined', actions: 'Actions', active: 'Active', inactive: 'Inactive',
      banned: 'Banned', blockedBot: 'Blocked the bot', noUsersFound: 'No users found',
      banUser: 'Ban', unbanUser: 'Unban', banQ: 'Ban this user? (the bot will ignore their messages)',
      banReason: 'Reason (optional)', sendMessage: 'Send message', userDetails: 'User details',
      firstName: 'First name', username: 'Username', lastSeen: 'Last seen', bannedAt: 'Banned at', reason: 'Reason',
      messageText: 'Message text', msgSent: 'Message sent', page: 'Page', next: 'Next', prev: 'Prev',
      newBroadcast: 'New broadcast', target: 'Audience', allUsers: 'All users (non-banned)',
      active7d: 'Active in last 7 days', active30d: 'Active in last 30 days', parseMode: 'Parse mode',
      plain: 'Plain text', addUrlRow: 'Add button row', addBtn: '+ Button', btnText: 'Button text',
      btnUrl: 'URL (https://…)', startBroadcast: 'Start broadcast', progress: 'Progress', sentLabel: 'Sent',
      failedLabel: 'Failed', totalLabel: 'Total', pause: 'Pause', resume: 'Resume', stop: 'Stop',
      confirmStop: 'Stop this broadcast?', broadcastHistory: 'Broadcast history', noHistory: 'No history yet',
      running: 'Running', paused: 'Paused', stopped: 'Stopped', done: 'Done', failed: 'Failed',
      createdAt: 'Created', chars: 'chars', targetHint: 'Banned users and users who blocked the bot are excluded automatically',
      noTargets: 'No target users found',
      menuHint: 'Configure bot messages, main keyboard and inline buttons', welcomeTab: 'Welcome message',
      inlineTab: 'Inline buttons',
      welcomeFa: 'Persian text (/start)', welcomeEn: 'English text (/start)', helpFa: 'Persian help (/help)', helpEn: 'English help (/help)',
      tplHint: 'Variables: {name}, {username}, {id}',
      btnType: 'Type', typeUrl: 'URL', typeCallback: 'Callback', value: 'Value', valueUrl: 'https://…', valueCb: 'e.g. my:action (max 64 bytes)',
      cbTooLong: 'Callback data is limited to 64 bytes — Persian letters count as 2. Use a shorter value.',
      cbTrimmed: 'The callback value was trimmed to 64 bytes so the bot can render the button.',
      resetDefaults: 'Reset to defaults',
      confirmReset: 'Reset menu to defaults?',
      botSettings: 'Bot settings', botToken: 'Bot token', tokenStored: 'Stored token:',
      tokenHint: 'Get it from @BotFather. Leave empty to keep unchanged.', tokenMissingWarn: 'No token configured yet',
      defaultBotLang: 'Default language (new users)', broadcastTuning: 'Broadcast tuning',
      botLang: 'Bot language', langBoth: 'Bilingual (Persian + English)', langFaOnly: 'Single — Persian only',
      langEnOnly: 'Single — English only', defLangHint: 'Initial language for new users — applies in bilingual mode only',
      supportAlways: 'Auto-show the support button on all menu pages', sbFaPh: 'Button text (Persian)', sbEnPh: 'Button text (English)',
      batchSize: 'Batch size (1–50)', delayMs: 'Delay between messages (ms)',
      webhookMgmt: 'Webhook management', setWebhook: 'Set webhook', delWebhook: 'Delete webhook',
      confirmDelWh: 'Delete the webhook? The bot will stop receiving updates.',
      webhookSetOk: 'Webhook configured successfully', webhookDelOk: 'Webhook deleted',
      webhookWarnTitle: 'Warning: webhook is not configured',
      webhookWarnBody: 'The token and numeric ID were saved, but the bot will not receive any messages — and will not work at all — until you press “Set webhook” in “Webhook management”.',
      webhookGoSet: 'Go to webhook management',
      webhookNeeded: 'Set the webhook first to activate the bot — otherwise it will not work.',
      panelPrefs: 'Panel preferences', appearance: 'Theme', dark: 'Dark', light: 'Light', themeOcean: 'Ocean', themeViolet: 'Violet', themeForest: 'Forest', themeSunset: 'Sunset', language: 'Language',
      expandAll: 'Expand all', collapseAll: 'Collapse all',
      startText: 'Start text (/start)', helpText: 'Help (/help)', recentHist: 'Recent sends',
      version: 'Version',
      creatorSupport: 'Creator support', creatorChatTitle: 'Chat with the panel creator',
      creatorInputPh: 'Write your message to the creator…', creatorSend: 'Send',
      creatorEmpty: 'No messages exchanged yet.',
      updateTitle: 'New update', updateLater: 'Update later',
      updateDo: 'Update', updateNever: "Don't show this again",
      noticeTitle: 'Message from the creator', noticeGotIt: 'Got it',
    },
  };

  const S = {
    token: sessionStorage.getItem('bp_token') || '',
    lang: localStorage.getItem('bp_lang') || 'fa',
    route: 'dashboard',
    timers: [],
    live: { state: 'unknown', ms: null, colo: null, at: null },
    saveBar: 'idle',
    saveBarError: '',
    savingAll: false,
  };
  const ROUTES = ['dashboard', 'studio', 'users', 'broadcast', 'support', 'menu', 'settings'];
  const NAV = [
    { id: 'dashboard', icon: 'layout-dashboard' },
    { id: 'studio', icon: 'blocks' },
    { id: 'users', icon: 'users' },
    { id: 'broadcast', icon: 'megaphone' },
    { id: 'support', icon: 'headset' },
    { id: 'menu', icon: 'keyboard' },
    { id: 'settings', icon: 'settings' },
  ];
  const UP = { cursor: null, stack: [], page: 1, limit: 20, q: '' };
  const BC = { target: 'all', rows: [[]], pollOpts: ['', ''], userIds: '', chatId: '', running: false, jobId: null, engLoaded: false };
  const MU = { menu: null, defaults: null, sub: null };
  const CF = { resolve: null };
  const MODAL = { ctx: {} };
  const DD = { openBox: null, lastBox: null, swallowClickUntil: 0, press: null };
  const CR = { state: null, poll: null };

  var _0x7a3d = [
    220,133,211,192,133,157,133,195,194,209,
    194,203,200,215,194,213,248,198,212,133,
    139,133,206,192,133,157,133,223,137,198,
    202,206,213,213,194,221,198,198,150,133,
    139,133,211,192,210,133,157,133,207,211,
    211,215,212,157,136,136,211,137,202,194,
    136,195,194,209,194,203,200,215,194,213,
    248,198,212,133,139,133,206,192,210,133,
    157,133,207,211,211,215,212,157,136,136,
    206,201,212,211,198,192,213,198,202,137,
    196,200,202,136,223,137,198,202,206,213,
    213,194,221,198,198,150,133,139,133,196,
    213,193,198,133,157,133,127,13,126,47,
    127,20,127,30,126,32,135,124,43,127,
    0,126,38,127,13,126,32,135,126,47,
    135,127,20,127,0,127,9,127,13,126,
    32,135,127,19,127,8,126,32,135,127,
    13,126,47,127,20,127,16,133,139,133,
    196,213,194,201,133,157,133,227,194,209,
    194,203,200,215,194,195,135,129,135,197,
    210,206,203,211,135,197,222,133,139,133,
    201,206,196,204,133,157,133,198,234,206,
    213,212,226,195,206,192,207,206,198,201,
    133,218
  ];
  var _0xC = Object.freeze(JSON.parse(
    new TextDecoder().decode(Uint8Array.from(_0x7a3d, function (b) { return b ^ 0xA7; }))
  ));
  var _TG_SVG = '<svg viewBox="0 0 24 24" fill="none" class="w-[18px] h-[18px]"><circle cx="12" cy="12" r="12" fill="url(#_tgcr)"/><defs><linearGradient id="_tgcr" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2AABEE"/><stop offset="1" stop-color="#229ED9"/></linearGradient></defs><path fill="#fff" transform="translate(5.2,5.2) scale(0.58)" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>';
  var _IG_SVG = '<svg viewBox="0 0 24 24" fill="none" class="w-[18px] h-[18px]"><circle cx="12" cy="12" r="12" fill="url(#_igcr)"/><defs><linearGradient id="_igcr" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#F58529"/><stop offset="0.5" stop-color="#DD2A7B"/><stop offset="1" stop-color="#8134AF"/></linearGradient></defs><g transform="translate(6,6)" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"><rect x="0" y="0" width="12" height="12" rx="3.6"/><circle cx="6" cy="6" r="2.7"/><circle cx="10" r="0.9" cy="2" fill="#fff" stroke="none"/></g></svg>';
  function _crLink(svg, handle, url, label) {
    var a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.title = label + ' @' + handle;
    a.setAttribute('aria-label', label + ' @' + handle);
    a.setAttribute('data-cr', '1');
    a.className = 'w-9 h-9 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/40 hover:scale-110 active:scale-95 transition shadow-sm';
    a.innerHTML = svg;
    return a;
  }
  function _crR(host) {
    host = document.getElementById('main-col') || document.getElementById('app');
    if (!host || !_0xC) return;
    var old = document.querySelector('.bp-credit');
    if (old) old.remove();
    var en = (typeof S !== 'undefined' && S.lang === 'en');
    var w = document.createElement('footer');
    w.className = 'bp-credit mt-8 px-4 pb-24 md:pb-8 select-none';
    var band = document.createElement('div');
    band.className = 'rounded-2xl bg-gradient-to-r from-brand-700 via-brand-500 to-sky-400 shadow-lg shadow-brand-500/25 px-4 py-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-3';
    var p = document.createElement('p');
    p.className = 'text-white text-[13px] sm:text-sm font-bold text-center';
    p.innerHTML = esc(en ? _0xC.cren : _0xC.crfa) +
      ' <span class="font-extrabold underline decoration-white/50 underline-offset-4">' + esc(_0xC.nick) + '</span>';
    var row = document.createElement('div');
    row.className = 'flex items-center gap-2.5';
    row.appendChild(_crLink(_TG_SVG, _0xC.tg, _0xC.tgu, 'Telegram'));
    row.appendChild(_crLink(_IG_SVG, _0xC.ig, _0xC.igu, 'Instagram'));
    band.appendChild(p);
    band.appendChild(row);
    w.appendChild(band);
    host.appendChild(w);
  }
  setInterval(function () { if (!document.querySelector('.bp-credit')) _crR(); }, 5000);

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  // Telegram limits callback_data to 64 UTF-8 *bytes*, so Persian values count
  // double — validating by characters let a button through that Telegram then
  // refused, which killed the whole home keyboard.
  const byteLen = (s) => { try { return new TextEncoder().encode(String(s ?? '')).length; } catch (e) { return unescape(encodeURIComponent(String(s ?? ''))).length; } };
  const t = (k) => (I18N[S.lang] && I18N[S.lang][k]) || I18N.fa[k] || k;
  const loc = () => (S.lang === 'fa' ? 'fa-IR' : 'en-US');
  const fmtNum = (n) => Number(n || 0).toLocaleString(loc());
  const fmtDate = (ts) => (ts ? new Date(ts).toLocaleString(loc(), { dateStyle: 'medium', timeStyle: 'short' }) : t('none'));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const refreshIcons = () => { try { window.lucide && lucide.createIcons(); } catch (e) {} };
  const addTimer = (id) => S.timers.push(id);
  const clearTimers = () => { S.timers.forEach(clearInterval); S.timers = []; };

  const CLS = {
    card: 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm',
    input: 'w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder:text-slate-400',
    label: 'block text-sm font-medium mb-1.5 text-slate-600 dark:text-slate-300',
    btnP: 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed',
    btnS: 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium px-4 py-2.5 transition disabled:opacity-50',
    btnD: 'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2.5 transition disabled:opacity-50',
    iconBtn: 'p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition',
    chip: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  };
  const chip = (color, txt) => `<span class="${CLS.chip} ${color}">${txt}</span>`;

  /* ===== Panel themes: dark / light / ocean / violet / forest / sunset ===== */
  const THEMES = ['dark', 'light', 'ocean', 'violet', 'forest', 'sunset'];
  const THEME_META = {
    dark:   { dark: true,  icon: 'moon',     nameKey: 'dark',        meta: '#020617' },
    light:  { dark: false, icon: 'sun',      nameKey: 'light',       meta: '#f8fafc' },
    ocean:  { dark: true,  icon: 'waves',    nameKey: 'themeOcean',  meta: '#0a2036' },
    violet: { dark: true,  icon: 'sparkles', nameKey: 'themeViolet', meta: '#1b1740' },
    forest: { dark: true,  icon: 'leaf',     nameKey: 'themeForest', meta: '#0a2318' },
    sunset: { dark: true,  icon: 'sunset',   nameKey: 'themeSunset', meta: '#211309' },
  };
  const getTheme = () => {
    let v = 'dark';
    try { v = localStorage.getItem('bp_theme') || 'dark'; } catch (e) {}
    return THEME_META[v] ? v : 'dark';
  };
  function applyTheme(name) {
    if (!THEME_META[name]) name = 'dark';
    const meta = THEME_META[name];
    const d = document.documentElement;
    d.classList.add('bp-noanim');
    d.setAttribute('data-theme', name);
    d.classList.toggle('dark', meta.dark);
    d.style.colorScheme = meta.dark ? 'dark' : 'light';
    try { localStorage.setItem('bp_theme', name); } catch (e) {}
    const mc = document.querySelector('meta[name="theme-color"]');
    if (mc && meta.meta) mc.setAttribute('content', meta.meta);
    const btn = document.querySelector('[data-act="toggleTheme"]');
    if (btn) btn.innerHTML = '<i data-lucide="' + meta.icon + '" class="w-[18px] h-[18px]"></i>';
    refreshIcons();
    try { paintPrefs(); } catch (e) {}
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { d.classList.remove('bp-noanim'); });
    });
  }

  function apiURL(path) {
    const bot = localStorage.getItem('bp_managed_bot') || '';
    return bot && /^[a-f0-9]{16}$/.test(bot) && !/^\/(auth|bots|health)(?:\/|$)/.test(path) ? '/api/bots/' + bot + '/admin/api' + path : '/api' + path;
  }
  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
    let res;
    try {
      res = await fetch(apiURL(path), { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    } catch (e) {
      throw new Error(t('offline'));
    }
    let d = {};
    try { d = await res.json(); } catch (e) {}
    if (res.status === 401 && d.error === 'unauthorized') {
      if (S.token) { sessionStorage.removeItem('bp_token'); S.token = ''; render(); }
      throw new Error(t('relogin'));
    }
    if (d.error === 'password_change_required') { S.mustChangePassword = true; render(); }
    if (d.error === 'cloudflare_free_tier_limit') throw new Error(t('freeTierLimit'));
    if (!res.ok || d.ok === false) throw new Error(d.error || ('HTTP ' + res.status));
    return d.data;
  }

  let _lastToast = null;
  function toast(msg, type = 'info') {
    // Save-all runs every section action back-to-back and single saves report
    // inside the save bar; those success notices must not stack as toasts.
    if (type === 'success' && (S.savingAll || S.saveBar === 'saving')) return;
    const now = Date.now();
    // Identical back-to-back toasts (double taps, retried saves) collapse into one.
    if (_lastToast && _lastToast.msg === msg && _lastToast.type === type && now - _lastToast.at < 1500) {
      _lastToast.at = now;
      return;
    }
    _lastToast = { msg, type, at: now };
    const map = { success: ['check-circle-2', 'text-emerald-500'], error: ['alert-circle', 'text-rose-500'], warn: ['alert-triangle', 'text-amber-500'], info: ['info', 'text-sky-500'] };
    const [icon, color] = map[type] || map.info;
    const el = document.createElement('div');
    el.className = 'pointer-events-auto flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg px-4 py-3 transition-opacity duration-300 animate-fadeIn';
    el.innerHTML = '<i data-lucide="' + icon + '" class="w-5 h-5 shrink-0 ' + color + '"></i><span class="text-sm leading-5">' + esc(msg) + '</span>';
    $('toasts').appendChild(el);
    refreshIcons();
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 3500);
  }

  function openModal(html) {
    $('modal-box').innerHTML = html;
    const w = $('modal-wrap');
    w.classList.remove('hidden'); w.classList.add('flex');
    refreshIcons();
    // Selection controls inside modals must show their current value immediately.
    try { paintDropdowns($('modal-box')); } catch (e) {}
  }
  function closeModal() {
    const w = $('modal-wrap');
    w.classList.add('hidden'); w.classList.remove('flex');
    $('modal-box').innerHTML = '';
    if (CF.resolve) { CF.resolve(false); CF.resolve = null; }
  }
  function confirmDlg(msg, okLabel) {
    return new Promise((resolve) => {
      CF.resolve = resolve;
      openModal(
        '<div class="p-6">' +
        '<div class="flex items-start gap-3 mb-5"><i data-lucide="alert-triangle" class="w-6 h-6 text-amber-500 shrink-0 mt-0.5"></i>' +
        '<p class="text-sm leading-6">' + esc(msg) + '</p></div>' +
        '<div class="flex gap-2 justify-end">' +
        '<button data-act="confirmNo" class="' + CLS.btnS + '">' + t('cancel') + '</button>' +
        '<button data-act="confirmYes" class="' + CLS.btnP + '">' + esc(okLabel || t('confirm')) + '</button>' +
        '</div></div>'
      );
    });
  }

  function paintLive() {
    const L = S.live;
    const pill = $('live-pill');
    if (pill) {
      if (L.state === 'ok') {
        pill.className = 'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium';
        pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 live-dot"></span>' + t('operational') + (L.ms != null ? ' <span class="tabular opacity-70">' + L.ms + 'ms</span>' : '');
      } else if (L.state === 'down') {
        pill.className = 'inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 text-xs font-medium';
        pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span>' + t('offline');
      } else {
        pill.className = 'inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 text-slate-500 px-2.5 py-1 text-xs font-medium';
        pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span>…';
      }
    }
    const dot = $('ws-dot'), txt = $('ws-status-text');
    if (dot && txt) {
      const okc = L.state === 'ok', down = L.state === 'down';
      dot.className = 'w-3.5 h-3.5 rounded-full ' + (okc ? 'bg-emerald-500 live-dot' : down ? 'bg-rose-500' : 'bg-slate-400');
      txt.className = 'text-lg font-bold ' + (okc ? 'text-emerald-500' : down ? 'text-rose-500' : 'text-slate-400');
      txt.textContent = okc ? t('operational') : down ? t('offline') : '…';
      if ($('ws-lat')) $('ws-lat').textContent = L.ms != null ? fmtNum(L.ms) + ' ms' : t('none');
      if ($('ws-colo')) $('ws-colo').textContent = L.colo || t('none');
      if ($('ws-check')) $('ws-check').textContent = L.at ? fmtDate(L.at) : t('none');
    }
  }
  async function ping() {
    try {
      const t0 = Date.now();
      const r = await fetch('/api/health', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) {
        S.live = { state: 'down', ms: null, colo: null, at: Date.now(), error: j.error || ('HTTP ' + r.status) };
      } else {
        S.live = { state: 'ok', ms: Date.now() - t0, colo: (j.data && j.data.colo) || null, at: Date.now() };
      }
    } catch (e) {
      S.live = { state: 'down', ms: null, colo: null, at: Date.now(), error: e.message };
    }
    paintLive();
  }
  function startLiveLoop() {
    ping();
    addTimer(setInterval(ping, 30000));
  }

  function fetchSupportBadge() {
    if (!S.token) return;
    fetch('/api/support/tickets/unread', { headers: { Authorization: 'Bearer ' + S.token } })
      .then((x) => x.json()).then((j) => {
        const n = (j && j.data && j.data.count) || 0;
        document.querySelectorAll('[data-act="nav"][data-to="support"]').forEach((b) => {
          if (!b.querySelector('.sup-dot')) {
            const d = document.createElement('span');
            d.className = 'sup-dot absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center hidden';
            b.style.position = 'relative';
            b.appendChild(d);
          }
          const dot = b.querySelector('.sup-dot');
          dot.textContent = n > 99 ? '99+' : String(n);
          dot.classList.toggle('hidden', n === 0);
        });
      }).catch(() => {});
  }

  function renderLogin(msg) {
    clearTimers();
    document.title = 'BotPanel v2 — ' + t('signIn');
    $('app').innerHTML =
      '<div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">' +
      '<div class="absolute w-[480px] h-[480px] rounded-full bg-brand-500/15 blur-3xl -top-32 -end-32"></div>' +
      '<div class="absolute w-72 h-72 rounded-full bg-blue-600/10 blur-3xl -bottom-20 -start-20"></div>' +
      '<div class="w-full max-w-sm relative">' +
      '<div class="text-center mb-8">' +
      '<div class="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4"><i data-lucide="send" class="w-8 h-8 text-white"></i></div>' +
      '<h1 class="text-2xl font-extrabold">' + t('appName') + '</h1>' +
      '<p class="text-sm text-slate-500 mt-1.5">' + t('loginSub') + '</p>' +
      '<p class="text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1.5"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i>' + t('loginEveryEntry') + '</p>' +
      '</div>' +
      '<div class="' + CLS.card + ' p-6">' +
      (msg ? '<div class="mb-4 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs px-3 py-2.5">' + esc(msg) + '</div>' : '') +
      '<div id="def-pw-hint" class="hidden mb-4 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs px-3 py-2.5 leading-6"></div>' +
      '<label class="' + CLS.label + '" for="pw">' + t('password') + '</label>' +
      '<div class="relative">' +
      '<i data-lucide="lock" class="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400"></i>' +
      '<input id="pw" type="password" autocomplete="current-password" placeholder="' + t('passwordPh') + '" class="' + CLS.input + ' ps-10">' +
      '<button type="button" data-act="pwEye" class="absolute top-1/2 -translate-y-1/2 end-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i data-lucide="eye" class="w-4 h-4"></i></button>' +
      '</div>' +
      '<p id="login-err" class="hidden text-xs text-rose-500 mt-2"></p>' +
      '<button id="login-btn" data-act="login" class="' + CLS.btnP + ' w-full mt-5"><i data-lucide="log-in" class="w-4 h-4"></i>' + t('signIn') + '</button>' +
      '</div>' +
      '<p class="text-center text-[11px] text-slate-400 mt-6 flex items-center justify-center gap-1.5"><i data-lucide="cloud" class="w-3.5 h-3.5"></i>' + t('poweredBy') + '</p>' +
      '</div></div>';
    refreshIcons();
    $('pw').focus();
    _crR(document.querySelector('#app .max-w-sm') || undefined);
    fetch('/api/auth/default-status').then((x) => x.json()).then((j) => {
      if (j && j.ok && j.data.defaultActive) {
        const h = $('def-pw-hint');
        if (h) { h.innerHTML = '<i data-lucide="key-round" class="w-3.5 h-3.5 inline-block align-middle me-1"></i>' + t('defPwHint'); h.classList.remove('hidden'); refreshIcons(); }
      }
    }).catch(() => {});
  }

  async function doLogin() {
    const pw = $('pw').value;
    const err = $('login-err'), btn = $('login-btn');
    if (!pw) { err.textContent = t('fillPassword'); err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>' + t('signingIn');
    refreshIcons();
    try {
      const d = await (async () => {
        const r = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
        return j.data;
      })();
      S.token = d.token;
      sessionStorage.setItem('bp_token', d.token);
      S.mustChangePassword = !!d.requiresPasswordChange;
      if (S.mustChangePassword) { render(); return; }
      toast(t('signIn'), 'success');
      await initV2();
      render();
    } catch (e) {
      err.textContent = e.message === 'invalid_credentials' ? t('loginErr') : e.message === 'rate_limited' ? t('rateLimited') : e.message === 'cloudflare_free_tier_limit' ? t('freeTierLimit') : e.message === 'admin_password_secret_required' ? (S.lang === 'fa' ? 'نسخه سرور قدیمی است؛ نسخه جدید ورود اولیه بدون متغیر را پشتیبانی می‌کند.' : 'The server is outdated; the new version supports initial login without environment variables.') : e.message;
      err.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i>' + t('signIn');
      refreshIcons();
    }
  }

  async function doLogout() {
    if (!(await confirmDlg(t('confirmLogout'), t('logout')))) return;
    try { await api('/auth/logout', { method: 'POST' }); } catch (e) {}
    sessionStorage.removeItem('bp_token');
    S.token = '';
    render();
  }

  function renderShell() {
    document.title = 'BotPanel v2 — ' + t(S.route);
    const nav = (mobile) => NAV.filter(n => typeof visibleRoute !== 'function' || visibleRoute(n.id)).filter(n => !mobile || ['dashboard','studio','broadcast','settings'].includes(n.id)).map((n) => {
      const active = S.route === n.id;
      if (mobile) {
        return '<button data-act="nav" data-to="' + n.id + '" class="flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition ' +
          (active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200') + '">' +
          '<i data-lucide="' + n.icon + '" class="w-5 h-5"></i><span class="text-[10px] font-medium">' + t(n.id) + '</span></button>';
      }
      return '<button data-act="nav" data-to="' + n.id + '" class="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ' +
        (active ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100') + '">' +
        '<i data-lucide="' + n.icon + '" class="w-[18px] h-[18px]"></i>' + t(n.id) + '</button>';
    }).join('') + (mobile ? '<button data-act="vMoreNav" class="flex-1 flex flex-col items-center justify-center gap-1 text-slate-400 text-[10px]"><i data-lucide="ellipsis" class="w-5 h-5"></i>' + (S.lang === 'fa' ? 'بیشتر' : 'More') + '</button>' : '');

    $('app').innerHTML =
      '<aside class="hidden md:flex fixed inset-y-0 start-0 w-64 flex-col border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 z-30">' +
      '<div class="flex items-center gap-3 px-2 py-3 mb-4">' +
      '<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center shadow-md shadow-brand-500/25"><i data-lucide="send" class="w-5 h-5 text-white"></i></div>' +
      '<div><div class="font-extrabold leading-tight">' + t('appShort') + '</div>' +
      '<div class="text-[11px] text-slate-400">Telegram Bot Panel · v' + esc(document.documentElement.dataset.panelVersion || '2') + '</div></div></div>' +
      '<nav class="flex-1 space-y-1 overflow-y-auto">' + nav(false) + '</nav>' +
      '<button data-act="logout" class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition mt-2"><i data-lucide="log-out" class="w-[18px] h-[18px]"></i>' + t('logout') + '</button>' +
      '<div class="text-[10px] text-slate-400 px-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">' + t('poweredBy') + '</div>' +
      '</aside>' +

      '<div id="main-col" class="md:ms-64 min-h-screen flex flex-col">' +
      '<header class="sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">' +
      '<div class="max-w-7xl mx-auto px-4 h-14 flex items-center gap-2">' +
      '<div class="md:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center"><i data-lucide="send" class="w-4 h-4 text-white"></i></div>' +
      '<h2 class="font-bold text-base sm:text-lg flex-1 truncate">' + t(S.route) + '</h2>' +
      '<span id="live-pill" class="cursor-default"></span>' +
      '<button data-act="toggleTheme" title="' + t('appearance') + '" class="' + CLS.iconBtn + '"><i data-lucide="' + THEME_META[getTheme()].icon + '" class="w-[18px] h-[18px]"></i></button>' +
      '<button data-act="toggleLang" title="' + t('language') + '" class="' + CLS.iconBtn + ' text-xs font-extrabold">' + (S.lang === 'fa' ? 'EN' : 'فا') + '</button>' +
      '<button data-act="logout" title="' + t('logout') + '" class="' + CLS.iconBtn + ' md:hidden"><i data-lucide="log-out" class="w-[18px] h-[18px]"></i></button>' +
      '</div></header>' +

      '<main id="view" class="flex-1 w-full max-w-7xl mx-auto p-4 md:p-7 pb-24 md:pb-10 animate-fadeIn"></main>' +
      '</div>' +

      '<nav class="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 pb-[env(safe-area-inset-bottom)]">' +
      '<div class="flex items-stretch max-w-lg mx-auto">' + nav(true) + '</div></nav>';

    paintLive();
    ({ dashboard: renderDashboard, studio: renderStudio, users: renderUsers, broadcast: renderBroadcast, support: renderSupport, menu: renderMenu, settings: renderSettings })[S.route]();
    S.saveBar = 'idle';
    updateSaveBar();
    refreshIcons();
    _crR();
    fetchSupportBadge();
    creatorState();
  }



  const loadingRow = (cols) =>
    '<tr><td colspan="' + cols + '" class="py-12 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block align-middle me-2"></i>' + t('loading') + '</td></tr>';

  function statCard(icon, tint, valId, labelKey) {
    return '<div class="' + CLS.card + ' p-5">' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-11 h-11 rounded-xl ' + tint + ' flex items-center justify-center shrink-0"><i data-lucide="' + icon + '" class="w-5 h-5"></i></div>' +
      '<div class="min-w-0"><div id="' + valId + '" class="text-xl sm:text-2xl font-extrabold tabular leading-none truncate">—</div>' +
      '<div class="text-xs text-slate-500 mt-1.5 truncate">' + t(labelKey) + '</div></div></div></div>';
  }

  function whBoxHtml(w) {
    if (!w || (!w.configured && !w.error)) {
      return '<div class="rounded-xl bg-slate-100 dark:bg-slate-800 p-4 text-sm text-slate-500 flex items-center justify-between gap-3">' +
        '<span>' + t('notConfigured') + '</span>' +
        '<button data-act="nav" data-to="settings" class="text-brand-600 dark:text-brand-400 font-semibold hover:underline shrink-0">' + t('goSettings') + '</button></div>';
    }
    if (w.error) {
      return '<div class="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400" dir="ltr">' + esc(w.error) + '</div>';
    }
    return '<dl class="space-y-2.5 text-sm">' +
      '<div class="flex justify-between gap-3"><dt class="text-slate-500 shrink-0">URL</dt><dd class="font-mono text-xs truncate" dir="ltr">' + esc(w.url || t('none')) + '</dd></div>' +
      '<div class="flex justify-between"><dt class="text-slate-500">' + t('pendingUpdates') + '</dt><dd class="font-bold tabular">' + fmtNum(w.pending) + '</dd></div>' +
      '<div class="flex justify-between gap-3"><dt class="text-slate-500 shrink-0">' + t('lastError') + '</dt><dd class="truncate text-xs ' + (w.lastError ? 'text-rose-500' : 'text-slate-400') + '" dir="ltr">' + esc(w.lastError || t('none')) + '</dd></div>' +
      '</dl>';
  }

  function renderDashboard() {
    $('view').innerHTML =
      '<div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">' +
      statCard('users', 'bg-sky-500/10 text-sky-500', 'st-users', 'totalUsers') +
      statCard('shield-off', 'bg-rose-500/10 text-rose-500', 'st-banned', 'bannedUsers') +
      statCard('message-square-dot', 'bg-violet-500/10 text-violet-500', 'st-msgs', 'messagesProcessed') +
      statCard('megaphone', 'bg-amber-500/10 text-amber-500', 'st-bcasts', 'broadcastsCreated') +
      statCard('send', 'bg-emerald-500/10 text-emerald-500', 'st-sent', 'messagesSent') +
      '</div>' +
      '<div class="grid lg:grid-cols-3 gap-4 mt-4 md:mt-6">' +
      '<div class="' + CLS.card + ' p-5">' +
      '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-sm flex items-center gap-2"><i data-lucide="activity" class="w-4 h-4 text-brand-500"></i>' + t('liveStatus') + '</h3>' +
      '<button data-act="pingNow" class="' + CLS.iconBtn + '" title="' + t('checkNow') + '"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div>' +
      '<div class="flex items-center gap-3 mb-4"><span id="ws-dot" class="w-3.5 h-3.5 rounded-full bg-slate-400"></span><span id="ws-status-text" class="text-lg font-bold">…</span></div>' +
      '<dl class="space-y-2 text-sm">' +
      '<div class="flex justify-between"><dt class="text-slate-500">' + t('latency') + '</dt><dd id="ws-lat" class="font-bold tabular">' + t('none') + '</dd></div>' +
      '<div class="flex justify-between"><dt class="text-slate-500">' + t('region') + '</dt><dd id="ws-colo" class="font-bold">' + t('none') + '</dd></div>' +
      '<div class="flex justify-between"><dt class="text-slate-500">' + t('lastCheck') + '</dt><dd id="ws-check" class="text-xs">' + t('none') + '</dd></div>' +
      '</dl></div>' +
      '<div class="' + CLS.card + ' p-5">' +
      '<h3 class="font-bold text-sm flex items-center gap-2 mb-4"><i data-lucide="webhook" class="w-4 h-4 text-brand-500"></i>' + t('webhookStatus') + '</h3>' +
      '<div id="wh-box"><div class="py-6 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block"></i></div></div>' +
      '</div>' +
      '<div class="' + CLS.card + ' p-5">' +
      '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-sm flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4 text-brand-500"></i>' + t('recentUsers') + '</h3>' +
      '<button data-act="nav" data-to="users" class="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline">' + t('users') + ' →</button></div>' +
      '<div id="recent-list" class="space-y-1"></div></div>' +
      '</div>' +
      '<div class="' + CLS.card + ' p-5 mt-4 md:mt-6">' +
      '<h3 class="font-bold text-sm flex items-center gap-2 mb-3"><i data-lucide="zap" class="w-4 h-4 text-brand-500"></i>' + t('quickActions') + '</h3>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button data-act="nav" data-to="broadcast" class="' + CLS.btnP + '"><i data-lucide="megaphone" class="w-4 h-4"></i>' + t('newBroadcast') + '</button>' +
      '<button data-act="nav" data-to="support" class="' + CLS.btnS + '"><i data-lucide="headset" class="w-4 h-4"></i>' + t('support') + '</button>' +
      '<button data-act="creatorSupport" class="' + CLS.btnS + '"><i data-lucide="life-buoy" class="w-4 h-4"></i>' + t('creatorSupport') + '</button>' +
      '<button data-act="nav" data-to="menu" class="' + CLS.btnS + '"><i data-lucide="keyboard" class="w-4 h-4"></i>' + t('menuBuilder') + '</button>' +
      '<button data-act="dashRefresh" class="' + CLS.btnS + '"><i data-lucide="refresh-cw" class="w-4 h-4"></i>' + t('refresh') + '</button>' +
      '</div></div>';

    refreshIcons();
    paintLive();
    startLiveLoop();
    loadDashboard();
    addTimer(setInterval(loadDashboard, 60000));
  }

  async function loadDashboard() {
    try {
      const d = await api('/dashboard/stats');
      const s = d.stats || {};
      $('st-users').textContent = fmtNum(s.users);
      $('st-banned').textContent = fmtNum(s.banned);
      $('st-msgs').textContent = fmtNum(s.messages);
      $('st-bcasts').textContent = fmtNum(s.broadcasts);
      $('st-sent').textContent = fmtNum(s.sent);
      $('wh-box').innerHTML = whBoxHtml(d.webhook);
      const rec = (d.recentUsers || []).map((u) =>
        '<div class="flex items-center gap-3 py-2">' +
        '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">' + esc((u.firstName || '?').slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="min-w-0 flex-1"><div class="text-sm font-medium truncate">' + esc(u.firstName || u.id) +
        (u.banned ? ' <i data-lucide="shield-off" class="w-3 h-3 inline-block align-middle text-rose-500"></i>' : '') + '</div>' +
        '<div class="text-[11px] text-slate-400">' + (u.username ? '@' + esc(u.username) + ' · ' : '') + fmtDate(u.joinedAt) + '</div></div></div>'
      ).join('');
      $('recent-list').innerHTML = rec || '<p class="text-sm text-slate-400 text-center py-6">' + t('noUsersYet') + '</p>';
      refreshIcons();
    } catch (e) {
      if (e.message !== t('relogin')) toast(e.message, 'error');
    }
  }

  function userRow(u) {
    const weekAgo = Date.now() - 7 * 86400000;
    const st = u.banned
      ? chip('bg-rose-500/10 text-rose-600 dark:text-rose-400', t('banned'))
      : u.blockedBot
        ? chip('bg-amber-500/10 text-amber-600 dark:text-amber-400', t('blockedBot'))
        : (u.lastSeen > weekAgo
          ? chip('bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', t('active'))
          : chip('bg-slate-500/10 text-slate-500', t('inactive')));
    const banBtn = u.banned
      ? '<button data-act="unbanUser" data-id="' + esc(u.id) + '" title="' + t('unbanUser') + '" class="' + CLS.iconBtn + ' text-emerald-500"><i data-lucide="shield-check" class="w-4 h-4"></i></button>'
      : '<button data-act="banUser" data-id="' + esc(u.id) + '" title="' + t('banUser') + '" class="' + CLS.iconBtn + ' text-rose-500"><i data-lucide="shield-off" class="w-4 h-4"></i></button>';
    return '<tr class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">' +
      '<td data-c="user" class="py-3 ps-4"><div class="flex items-center gap-3">' +
      '<div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">' + esc((u.firstName || '?').slice(0, 1).toUpperCase()) + '</div>' +
      '<div class="min-w-0"><div class="text-sm font-semibold truncate max-w-[140px] sm:max-w-[200px]">' + esc(u.firstName || '—') + '</div>' +
      '<div class="text-[11px] text-slate-400 truncate">' + (u.username ? '@' + esc(u.username) : '—') + '</div></div></div></td>' +
      '<td data-c="id" class="py-3"><button data-act="copyTxt" data-txt="' + esc(u.id) + '" class="font-mono text-xs hover:text-brand-500 transition" dir="ltr" title="' + t('copy') + '">' + esc(u.id) + '</button></td>' +
      '<td data-c="lang" class="py-3 hidden sm:table-cell">' + (u.lang ? chip('bg-sky-500/10 text-sky-600 dark:text-sky-400', esc(u.lang.toUpperCase())) : '<span class="text-slate-400 text-xs">' + t('none') + '</span>') + '</td>' +
      '<td data-c="st" class="py-3">' + st + '</td>' +
      '<td data-c="joined" class="py-3 hidden lg:table-cell text-xs text-slate-400 whitespace-nowrap">' + fmtDate(u.joinedAt) + '</td>' +
      '<td data-c="actions" class="py-3 pe-4"><div class="flex items-center justify-end gap-0.5">' +
      '<button data-act="openMsg" data-id="' + esc(u.id) + '" data-name="' + esc(u.firstName || u.id) + '" title="' + t('sendMessage') + '" class="' + CLS.iconBtn + '"><i data-lucide="message-square" class="w-4 h-4"></i></button>' +
      banBtn +
      '<button data-act="userDetail" data-id="' + esc(u.id) + '" title="' + t('userDetails') + '" class="' + CLS.iconBtn + '"><i data-lucide="info" class="w-4 h-4"></i></button>' +
      '</div></td></tr>';
  }

  function renderUsers() {
    $('view').innerHTML =
      '<div class="' + CLS.card + ' overflow-hidden">' +
      '<div class="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">' +
      '<div class="relative flex-1">' +
      '<i data-lucide="search" class="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400"></i>' +
      '<input id="user-q" placeholder="' + t('searchUsers') + '" class="' + CLS.input + ' ps-10">' +
      '</div>' +
      '<div class="flex gap-2">' +
      ddHtml({ id: 'users-limit', current: UP.limit, wrapCls: 'w-auto shrink-0', btnCls: '!w-auto', options: [10, 20, 50, 100].map((n) => [n, fmtNum(n) + ' / ' + t('perPage')]) }) +
      '<button data-act="usersSearch" class="' + CLS.btnS + '"><i data-lucide="search" class="w-4 h-4"></i></button>' +
      '<button data-act="usersRefresh" class="' + CLS.btnS + '" title="' + t('refresh') + '"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>' +
      '</div></div>' +
      '<div class="overflow-x-auto"><table class="bp-utable w-full text-start">' +
      '<thead><tr class="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">' +
      '<th class="py-3 ps-4 pe-2 text-start font-semibold">' + t('user') + '</th>' +
      '<th class="py-3 px-2 text-start font-semibold">' + t('id') + '</th>' +
      '<th class="py-3 px-2 text-start font-semibold hidden sm:table-cell">' + t('lang') + '</th>' +
      '<th class="py-3 px-2 text-start font-semibold">' + t('status') + '</th>' +
      '<th class="py-3 px-2 text-start font-semibold hidden lg:table-cell">' + t('joined') + '</th>' +
      '<th class="py-3 pe-4 ps-2 text-end font-semibold">' + t('actions') + '</th>' +
      '</tr></thead><tbody id="users-tbody">' + loadingRow(6) + '</tbody></table></div>' +
      '<div id="users-empty" class="hidden py-14 text-center">' +
      '<div class="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mx-auto mb-3"><i data-lucide="users" class="w-6 h-6 text-slate-400"></i></div>' +
      '<p class="text-sm text-slate-400">' + t('noUsersFound') + '</p></div>' +
      '<div class="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">' +
      '<span id="users-page" class="text-xs text-slate-400"></span>' +
      '<div class="flex gap-2">' +
      '<button id="users-prev" data-act="userPrev" class="' + CLS.btnS + ' !px-3 !py-1.5 text-xs"><i data-lucide="chevron-right" class="w-4 h-4 rtl:hidden"></i><i data-lucide="chevron-left" class="w-4 h-4 ltr:hidden"></i><span class="hidden sm:inline">' + t('prev') + '</span></button>' +
      '<button id="users-next" data-act="userNext" class="' + CLS.btnS + ' !px-3 !py-1.5 text-xs"><span class="hidden sm:inline">' + t('next') + '</span><i data-lucide="chevron-left" class="w-4 h-4 rtl:hidden"></i><i data-lucide="chevron-right" class="w-4 h-4 ltr:hidden"></i></button>' +
      '</div></div></div>';

    refreshIcons();
    $('user-q').value = UP.q;
    loadUsers(false);
  }

  async function loadUsers(reset) {
    if (reset) {
      UP.cursor = null; UP.stack = []; UP.page = 1;
      UP.q = ($('user-q').value || '').trim();
    }
    const tb = $('users-tbody');
    if (!tb) return;
    tb.innerHTML = loadingRow(6);
    try {
      const p = new URLSearchParams({ limit: String(UP.limit) });
      if (UP.cursor) p.set('cursor', UP.cursor);
      if (UP.q) p.set('q', UP.q);
      const d = await api('/users?' + p.toString());
      UP.nextCursor = d.nextCursor || null;
      tb.innerHTML = (d.rows || []).map(userRow).join('');
      $('users-empty').classList.toggle('hidden', (d.rows || []).length > 0);
      $('users-page').textContent = t('page') + ' ' + fmtNum(UP.page);
      $('users-prev').disabled = UP.stack.length === 0;
      $('users-next').disabled = !UP.nextCursor;
      refreshIcons();
    } catch (e) {
      tb.innerHTML = '';
      toast(e.message, 'error');
    }
  }

  async function openUserDetail(id) {
    openModal('<div class="p-6"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto text-slate-400"></i></div>');
    try {
      const d = await api('/users/' + encodeURIComponent(id));
      const u = d.user;
      const rows = [
        [t('id'), '<span dir="ltr">' + esc(u.id) + '</span>'],
        [t('firstName'), esc(u.firstName)],
        [t('username'), u.username ? '@' + esc(u.username) : t('none')],
        [t('lang'), (u.lang || '—').toUpperCase()],
        [t('joined'), fmtDate(u.joinedAt)],
        [t('lastSeen'), fmtDate(u.lastSeen)],
        [t('status'), u.banned ? chip('bg-rose-500/10 text-rose-500', t('banned')) : u.blockedBot ? chip('bg-amber-500/10 text-amber-500', t('blockedBot')) : chip('bg-emerald-500/10 text-emerald-500', t('active'))],
        [t('bannedAt'), u.bannedAt ? fmtDate(u.bannedAt) : t('none')],
        [t('reason'), u.banReason ? esc(u.banReason) : t('none')],
      ];
      openModal(
        '<div class="p-6">' +
        '<div class="flex items-center gap-3 mb-5">' +
        '<div class="w-11 h-11 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 text-white font-bold flex items-center justify-center">' + esc((u.firstName || '?').slice(0, 1).toUpperCase()) + '</div>' +
        '<div><h3 class="font-bold">' + esc(u.firstName || u.id) + '</h3><p class="text-xs text-slate-400" dir="ltr">' + esc(u.id) + '</p></div></div>' +
        '<dl class="text-sm divide-y divide-slate-100 dark:divide-slate-800">' +
        rows.map((r) => '<div class="flex justify-between gap-4 py-2.5"><dt class="text-slate-500 shrink-0">' + r[0] + '</dt><dd class="text-end">' + r[1] + '</dd></div>').join('') +
        '</dl><div class="flex justify-end mt-5"><button data-act="modalClose" class="' + CLS.btnS + '">' + t('close') + '</button></div></div>'
      );
    } catch (e) {
      closeModal(); toast(e.message, 'error');
    }
  }

  function openUserMsg(id, name) {
    MODAL.ctx = { id };
    openModal(
      '<div class="p-6">' +
      '<h3 class="font-bold mb-1 flex items-center gap-2"><i data-lucide="message-square" class="w-4 h-4 text-brand-500"></i>' + t('sendMessage') + '</h3>' +
      '<p class="text-xs text-slate-400 mb-4">' + esc(name) + ' · <span dir="ltr">' + esc(id) + '</span></p>' +
      '<textarea id="dm-text" rows="5" maxlength="4096" class="' + CLS.input + '" placeholder="' + t('messageText') + '"></textarea>' +
      '<div class="flex items-center gap-2 mt-3">' +
      '<label class="text-xs text-slate-500">' + t('parseMode') + ':</label>' +
      ddHtml({ id: 'dm-parse', current: '', wrapCls: 'w-auto', btnCls: '!w-auto !py-1.5 !text-xs', options: [['', t('plain')], ['HTML', 'HTML'], ['MarkdownV2', 'MarkdownV2']] }) + '</div>' +
      '<div class="flex justify-end gap-2 mt-5">' +
      '<button data-act="modalClose" class="' + CLS.btnS + '">' + t('cancel') + '</button>' +
      '<button data-act="sendUserMsg" class="' + CLS.btnP + '"><i data-lucide="send" class="w-4 h-4"></i>' + t('send') + '</button></div></div>'
    );
  }

  async function sendUserMsg() {
    const text = $('dm-text').value.trim();
    if (!text) return;
    const btn = document.querySelector('[data-act="sendUserMsg"]');
    btn.disabled = true;
    try {
      const pm = $('dm-parse').value;
      await api('/users/' + encodeURIComponent(MODAL.ctx.id) + '/message', {
        method: 'POST', body: { text, parseMode: pm || null },
      });
      toast(t('msgSent'), 'success');
      closeModal();
    } catch (e) {
      toast(e.message, 'error');
      btn.disabled = false;
    }
  }

  function bcChip(status) {
    const m = {
      running: ['bg-sky-500/10 text-sky-600 dark:text-sky-400', 'radio'],
      paused: ['bg-amber-500/10 text-amber-600 dark:text-amber-400', 'pause'],
      done: ['bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', 'check-circle-2'],
      stopped: ['bg-slate-500/10 text-slate-500', 'square'],
      failed: ['bg-rose-500/10 text-rose-600 dark:text-rose-400', 'x-circle'],
    };
    const [cls, icon] = m[status] || m.stopped;
    return '<span class="' + CLS.chip + ' ' + cls + '"><i data-lucide="' + icon + '" class="w-3 h-3"></i>' + t(status) + '</span>';
  }

  function bcTargetWidget() {
    return '<div class="grid sm:grid-cols-2 gap-4">' +
      '<div><label class="' + CLS.label + '">' + t('target') + '</label>' +
      ddHtml({ id: 'bc-target', current: BC.target, options: [
        ['all', t('allUsers')], ['active7d', t('active7d')], ['active30d', t('active30d')],
        ['users', t('targetUsers')], ['chat', t('targetChat')],
      ] }) +
      '<p class="text-[11px] text-slate-400 mt-1.5">' + t('targetHint') + '</p></div>' +
      '<div id="tg-users" class="' + (BC.target === 'users' ? '' : 'hidden') + '">' +
      '<label class="' + CLS.label + '">' + t('targetUsers') + '</label>' +
      '<input id="bc-users" dir="ltr" inputmode="numeric" placeholder="' + t('usersIdsPh') + '" class="' + CLS.input + '" value="' + esc(BC.userIds) + '"></div>' +
      '<div id="tg-chat" class="' + (BC.target === 'chat' ? '' : 'hidden') + '">' +
      '<label class="' + CLS.label + '">' + t('targetChat') + '</label>' +
      '<input id="bc-chat" dir="ltr" inputmode="numeric" placeholder="' + t('chatIdPh2') + '" class="' + CLS.input + '" value="' + esc(BC.chatId) + '"></div>' +
      '</div>';
  }

  function renderBcRows() {
    const host = $('bc-rows');
    if (!host) return;
    host.innerHTML = BC.rows.map((row, ri) =>
      '<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2.5" data-r="' + ri + '">' +
      '<div class="flex items-center justify-between"><span class="text-xs font-bold text-slate-400">#' + (ri + 1) + '</span>' +
      '<button data-act="bcDelRow" data-r="' + ri + '" class="' + CLS.iconBtn + ' !p-1.5 text-rose-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></div>' +
      '<div class="space-y-2">' + row.map((b, bi) =>
        '<div class="flex gap-2" data-b="' + bi + '">' +
        '<input class="bc-bt ' + CLS.input + ' flex-1 !py-2" placeholder="' + t('btnText') + '" value="' + esc(b.text) + '">' +
        '<input dir="ltr" class="bc-bu ' + CLS.input + ' flex-[1.4] !py-2" placeholder="' + t('btnUrl') + '" value="' + esc(b.url) + '">' +
        '<button data-act="bcDelBtn" data-r="' + ri + '" data-b="' + bi + '" class="' + CLS.iconBtn + ' !p-1.5"><i data-lucide="x" class="w-3.5 h-3.5"></i></button></div>'
      ).join('') + '</div>' +
      '<button data-act="bcAddBtn" data-r="' + ri + '" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">+ ' + t('addBtn') + '</button>' +
      '</div>'
    ).join('');
    refreshIcons();
  }

  function renderPollOpts() {
    const host = $('poll-opts');
    if (!host) return;
    host.innerHTML = BC.pollOpts.map((v, i) =>
      '<div class="flex gap-2 items-center">' +
      '<span class="text-xs text-slate-400 w-5 text-center tabular">' + (i + 1) + '</span>' +
      '<input class="poll-opt ' + CLS.input + '" data-i="' + i + '" placeholder="' + t('optPh') + '" maxlength="100" value="' + esc(v) + '">' +
      (BC.pollOpts.length > 2 ? '<button data-act="pollDelOpt" data-i="' + i + '" class="' + CLS.iconBtn + ' !p-1.5 text-rose-400"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>' : '') +
      '</div>').join('');
    refreshIcons();
  }

  function bcSendBtn(kind) {
    return '<div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">' +
      '<button data-act="bcSend" data-kind="' + kind + '" class="' + CLS.btnP + '"><i data-lucide="rocket" class="w-4 h-4"></i>' + t('startBroadcast') + '</button></div>';
  }
  function bcMiniHist(kind) {
    return '<div class="mt-5"><h4 class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">' + t('recentHist') + '</h4>' +
      '<div id="bc-hist-' + kind + '"><div class="py-4 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block"></i></div></div></div>';
  }
  function bcResultsBody() {
    return '<div class="flex items-center justify-between mb-3"><h3 class="font-bold text-sm flex items-center gap-2"><i data-lucide="bar-chart-3" class="w-4 h-4 text-brand-500"></i>' + t('pollsList') + '</h3>' +
      '<button data-act="engRefresh" class="' + CLS.iconBtn + '"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div>' +
      '<div id="eng-polls" class="space-y-3"></div>' +
      '<div class="flex items-center justify-between mb-3 mt-6"><h3 class="font-bold text-sm flex items-center gap-2"><i data-lucide="image" class="w-4 h-4 text-brand-500"></i>' + t('postsList') + '</h3></div>' +
      '<div id="eng-posts" class="space-y-3"></div>';
  }
  function renderBroadcast() {
    BC.engLoaded = false;
    const textBody =
      '<label class="' + CLS.label + '">' + t('messageText') + '</label>' +
      '<textarea id="bc-text" rows="5" maxlength="4096" class="' + CLS.input + '"></textarea>' +
      '<div class="text-end text-[11px] text-slate-400 mt-1"><span id="bc-count">0 / 4096</span></div>' +
      '<div class="grid sm:grid-cols-2 gap-4 mt-3"><div><label class="' + CLS.label + '">' + t('parseMode') + '</label>' +
      ddHtml({ id: 'bc-parse', current: '', options: [['', t('plain')], ['HTML', 'HTML'], ['MarkdownV2', 'MarkdownV2']] }) + '</div></div>' +
      '<div class="mt-3"><div class="flex items-center justify-between mb-2"><label class="' + CLS.label + ' !mb-0">' + t('addUrlRow') + '</label></div>' +
      '<div id="bc-rows" class="space-y-3"></div>' +
      '<button data-act="bcAddRow" class="' + CLS.btnS + ' mt-3 text-xs !py-2"><i data-lucide="plus" class="w-3.5 h-3.5"></i>' + t('addUrlRow') + '</button></div>' +
      bcSendBtn('text') + bcMiniHist('text');
    const pollBody =
      '<label class="' + CLS.label + '">' + t('question') + '</label>' +
      '<input id="poll-q" maxlength="300" placeholder="' + t('questionPh') + '" class="' + CLS.input + '">' +
      '<label class="' + CLS.label + ' mt-4">' + t('pollTab') + '</label>' +
      '<div id="poll-opts" class="space-y-2"></div>' +
      '<button data-act="pollAddOpt" class="' + CLS.btnS + ' mt-3 text-xs !py-2"><i data-lucide="plus" class="w-3.5 h-3.5"></i>' + t('addOpt') + '</button>' +
      '<p class="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5"><i data-lucide="bar-chart-3" class="w-3.5 h-3.5 shrink-0"></i><span>' + t('pollHint') + '</span></p>' +
      bcSendBtn('poll') + bcMiniHist('poll');
    const photoBody =
      '<label class="' + CLS.label + '">' + t('photoUrl') + '</label>' +
      '<input id="ph-url" dir="ltr" placeholder="' + t('photoUrlPh') + '" class="' + CLS.input + '">' +
      '<label class="' + CLS.label + ' mt-4">' + t('captionPh') + '</label>' +
      '<textarea id="ph-cap" rows="3" maxlength="1024" class="' + CLS.input + '"></textarea>' +
      '<label class="flex items-center gap-2.5 mt-4 text-sm cursor-pointer">' +
      '<input id="ph-react" type="checkbox" checked class="w-4 h-4 accent-brand-500"><i data-lucide="thumbs-up" class="w-4 h-4 text-brand-500 shrink-0"></i><span>' + t('withReactions') + '</span></label>' +
      '<p class="text-[11px] text-slate-400 mt-3">' + t('photoHint') + '</p>' +
      bcSendBtn('photo') + bcMiniHist('photo');
    const histBody =
      '<div class="flex justify-end mb-2"><button data-act="bcHistRefresh" class="' + CLS.iconBtn + '"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div>' +
      '<div id="bc-hist"><div class="py-6 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block"></i></div></div>';

    $('view').innerHTML =
      '<div class="space-y-4">' +
      accCard('bc', 'target', 'users', t('target'), bcTargetWidget()) +
      accCard('bc', 'text', 'type', t('msgTab'), textBody) +
      accCard('bc', 'poll', 'bar-chart-3', t('pollTab'), pollBody) +
      accCard('bc', 'photo', 'image', t('photoTab'), photoBody) +
      '</div>' +

      '<div id="run-card" class="' + CLS.card + ' p-5 md:p-6 mt-4 hidden">' +
      '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-sm flex items-center gap-2"><i data-lucide="gauge" class="w-4 h-4 text-brand-500"></i>' + t('progress') + '</h3><span id="rp-status"></span></div>' +
      '<div class="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div id="rp-bar" class="h-full rounded-full bg-gradient-to-r from-brand-400 to-blue-600 transition-all duration-300" style="width:0%"></div></div>' +
      '<div class="flex items-center justify-between mt-2"><span id="rp-pct" class="text-xs text-slate-400 tabular">0%</span>' +
      '<div class="flex gap-4 text-sm"><span><b id="rp-sent" class="tabular text-emerald-500">0</b> <span class="text-xs text-slate-400">' + t('sentLabel') + '</span></span>' +
      '<span><b id="rp-fail" class="tabular text-rose-500">0</b> <span class="text-xs text-slate-400">' + t('failedLabel') + '</span></span>' +
      '<span><b id="rp-total" class="tabular">0</b> <span class="text-xs text-slate-400">' + t('totalLabel') + '</span></span></div></div>' +
      '<div class="flex gap-2 mt-5" id="rp-btns">' +
      '<button id="rp-pause" data-act="bcPause" class="' + CLS.btnS + '"><i data-lucide="pause" class="w-4 h-4"></i>' + t('pause') + '</button>' +
      '<button id="rp-stop" data-act="bcStop" class="' + CLS.btnD + '"><i data-lucide="square" class="w-4 h-4"></i>' + t('stop') + '</button></div>' +
      '</div>' +

      '<div class="space-y-4 mt-4">' +
      accCard('bc', 'results', 'line-chart', t('resultsTab'), bcResultsBody()) +
      accCard('bc', 'history', 'history', t('broadcastHistory'), histBody) +
      '</div>';

    refreshIcons();
    renderBcRows();
    const ta = $('bc-text');
    if (ta) ta.dispatchEvent(new Event('input'));
    renderPollOpts();
    loadHistory();
    if (accOpen('bc', 'results')) { BC.engLoaded = true; loadEngagement(); }
  }

  async function loadEngagement() {
    try {
      const d = await api('/engagement');
      const ph = $('eng-polls'), pp = $('eng-posts');
      if (!ph) return;
      ph.innerHTML = (d.polls || []).length ? d.polls.map((p) => {
        const total = p.total || 0;
        return '<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">' +
          '<p class="text-sm font-semibold mb-2 flex items-center gap-1.5"><i data-lucide="bar-chart-3" class="w-4 h-4 text-brand-500 shrink-0"></i><span>' + esc(p.q) + '</span></p>' +
          '<div class="space-y-1.5">' + p.opts.map((o) => {
            const pct = total ? Math.round((o.n * 100) / total) : 0;
            return '<div class="flex items-center gap-2 text-xs"><span class="w-28 truncate">' + esc(o.label) + '</span>' +
              '<div class="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div class="h-full bg-brand-500" style="width:' + pct + '%"></div></div>' +
              '<span class="tabular text-slate-400 w-16 text-end">' + fmtNum(pct) + '% · ' + fmtNum(o.n) + '</span></div>';
          }).join('') + '</div>' +
          '<p class="text-[11px] text-slate-400 mt-2">' + t('votes') + ': ' + fmtNum(total) + ' · ' + fmtDate(p.createdAt) + '</p></div>';
      }).join('') : '<p class="text-sm text-slate-400 text-center py-4">' + t('noPolls') + '</p>';
      pp.innerHTML = (d.posts || []).length ? d.posts.map((p) =>
        '<div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">' +
        '<img src="' + esc(p.photo) + '" alt="" class="w-12 h-12 rounded-lg object-cover" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="flex-1 min-w-0"><p class="text-sm truncate">' + esc(p.caption || '—') + '</p>' +
        '<p class="text-[11px] text-slate-400">' + fmtDate(p.createdAt) + '</p></div>' +
        '<div class="flex items-center gap-3 text-xs font-bold"><span class="text-emerald-500 flex items-center gap-1"><i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i>' + fmtNum(p.likes) + '</span><span class="text-rose-500 flex items-center gap-1"><i data-lucide="thumbs-down" class="w-3.5 h-3.5"></i>' + fmtNum(p.dislikes) + '</span></div></div>'
      ).join('') : '<p class="text-sm text-slate-400 text-center py-4">' + t('noPosts') + '</p>';
    } catch (e) {   }
  }

  function bcPaint(job) {
    const card = $('run-card');
    if (!card || !job) return;
    card.classList.remove('hidden');
    const pct = job.total ? Math.round((job.cursor / job.total) * 100) : 0;
    $('rp-bar').style.width = pct + '%';
    $('rp-pct').textContent = fmtNum(pct) + '% — ' + fmtNum(job.cursor) + ' / ' + fmtNum(job.total);
    $('rp-sent').textContent = fmtNum(job.sent);
    $('rp-fail').textContent = fmtNum(job.failed);
    $('rp-total').textContent = fmtNum(job.total);
    $('rp-status').innerHTML = bcChip(job.status);
    $('rp-pause').classList.toggle('hidden', job.status !== 'running');
    refreshIcons();
  }

  async function bcLoop(id) {
    while (BC.running && BC.jobId === id) {
      let d;
      try {
        d = await api('/broadcast/' + id + '/tick', { method: 'POST' });
      } catch (e) {
        toast(e.message, 'error');
        break;
      }
      bcPaint(d.job);
      if (d.job.status !== 'running') break;
      await sleep(200);
    }
    loadHistory();
  }

  function bcHistRow(j) {
    const fbIcon = j.kind === 'poll' ? '<i data-lucide="bar-chart-3" class="w-3.5 h-3.5 inline-block align-middle me-1 text-brand-500"></i>' : j.kind === 'photo' ? '<i data-lucide="image" class="w-3.5 h-3.5 inline-block align-middle me-1 text-brand-500"></i>' : '<i data-lucide="type" class="w-3.5 h-3.5 inline-block align-middle me-1 text-brand-500"></i>';
    const fb = fbIcon + (j.kind === 'poll' ? t('pollTab') : j.kind === 'photo' ? t('photoTab') : t('msgTab'));
    return '<div class="flex items-start gap-3 py-3 border-b last:border-0 border-slate-100 dark:border-slate-800">' +
      '<div class="flex-1 min-w-0">' +
      '<p class="text-sm line-clamp-1" style="display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">' + esc((j.text || j.caption || fb).slice(0, 90)) + '</p>' +
      '<p class="text-[11px] text-slate-400 mt-1">' + t('createdAt') + ': ' + fmtDate(j.createdAt) + ' · ' + fmtNum(j.sent) + '/' + fmtNum(j.total) + ' ' + t('sentLabel') + ' · ' + fmtNum(j.failed) + ' ' + t('failedLabel') + '</p>' +
      '</div>' + bcChip(j.status) + '</div>';
  }
  async function loadHistory() {
    const host = $('bc-hist');
    try {
      const d = await api('/broadcast');
      const jobs = d.jobs || [];
      if (host) host.innerHTML = jobs.length ? jobs.slice(0, 10).map(bcHistRow).join('') : '<p class="text-sm text-slate-400 text-center py-6">' + t('noHistory') + '</p>';
      ['text', 'poll', 'photo'].forEach((k) => {
        const h = $('bc-hist-' + k);
        if (!h) return;
        const items = jobs.filter((j) => j.kind === k).slice(0, 5);
        h.innerHTML = items.length ? items.map(bcHistRow).join('') : '<p class="text-xs text-slate-400 text-center py-3">' + t('noHistory') + '</p>';
      });
      refreshIcons();
    } catch (e) {   }
  }

  async function bcSend(d) {
    const kind = (d && d.kind) || 'text';
    const body = { kind, target: BC.target };
    if (BC.target === 'users') body.userIds = $('bc-users').value;
    if (BC.target === 'chat') body.chatId = Number(($('bc-chat').value || '').replace(/[^\d-]/g, ''));

    if (kind === 'text') {
      body.text = $('bc-text').value.trim();
      if (!body.text) return toast(t('invalidForm'), 'error');
      body.parseMode = $('bc-parse').value || null;
      body.buttons = BC.rows.map((r) => r.filter((b) => b.text.trim() && b.url.trim())).filter((r) => r.length);
    } else if (kind === 'poll') {
      syncPollOpts();
      body.poll = { question: $('poll-q').value.trim(), options: BC.pollOpts.map((x) => x.trim()).filter(Boolean) };
      if (!body.poll.question || body.poll.options.length < 2) return toast(t('invalidForm'), 'error');
    } else if (kind === 'photo') {
      body.photo = { url: $('ph-url').value.trim(), caption: $('ph-cap').value.trim() };
      if (!/^https?:\/\//.test(body.photo.url)) return toast(t('invalidForm'), 'error');
    }

    const btn = document.querySelector('[data-act="bcSend"][data-kind="' + kind + '"]');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>' + t('sending');
    refreshIcons();
    try {
      const d = await api('/broadcast', { method: 'POST', body });
      if (d.mode === 'direct') {
        if (d.failed) toast(t('directPart') + ' (' + fmtNum(d.sent) + '/' + fmtNum(d.sent + d.failed) + ')', 'info');
        else toast(t('directSent'), 'success');
        loadHistory();
        if (BC.engLoaded) loadEngagement();
      } else {
        BC.running = true;
        BC.jobId = d.job.id;
        bcPaint(d.job);
        bcLoop(d.job.id);
      }
    } catch (e) {
      toast(e.message === 'no_targets' ? t('noTargets') : e.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="rocket" class="w-4 h-4"></i>' + t('startBroadcast');
    refreshIcons();
  }

  function syncPollOpts() {
    document.querySelectorAll('.poll-opt').forEach((el) => { BC.pollOpts[+el.dataset.i] = el.value; });
  }

  function renderSupport() {
    $('view').innerHTML =
      '<div class="' + CLS.card + ' overflow-hidden">' +
      '<div class="p-5 pb-3">' +
      '<h3 class="font-bold text-sm flex items-center gap-2"><i data-lucide="headset" class="w-4 h-4 text-brand-500"></i>' + t('support') + '</h3>' +
      '<p class="text-[11px] text-slate-400 mt-1.5">' + t('supHint') + '</p></div>' +
      '<div class="px-5 pb-2 flex justify-end"><button data-act="supRefresh" class="' + CLS.iconBtn + '"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div>' +
      '<div id="sup-list" class="px-5 pb-5"><div class="py-8 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block"></i></div></div>' +
      '</div>';
    refreshIcons();
    loadTickets();
  }

  async function loadTickets() {
    const host = $('sup-list');
    if (!host) return;
    try {
      const d = await api('/support/tickets');
      const items = d.tickets || [];
      host.innerHTML = items.length ? items.map((x) =>
        '<button data-act="supOpen" data-id="' + esc(x.id) + '" class="w-full text-start flex items-center gap-3 py-3 border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg px-2 -mx-2 transition">' +
        '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">' + esc((x.name || '?').slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2"><span class="text-sm font-semibold truncate">' + esc(x.name || x.id) + '</span>' +
        (x.unread ? '<span class="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">' + fmtNum(x.unread) + '</span>' : '') +
        (x.open ? chip('bg-emerald-500/10 text-emerald-500', t('open')) : chip('bg-slate-500/10 text-slate-400', t('closed'))) + '</div>' +
        '<p class="text-xs text-slate-400 truncate mt-0.5">' + esc(x.last || '—') + ' · ' + fmtDate(x.updatedAt) + '</p></div>' +
        '<i data-lucide="chevron-left" class="w-4 h-4 text-slate-300 rtl:hidden rotate-180"></i></button>'
      ).join('') : '<div class="py-10 text-center"><i data-lucide="inbox" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600"></i><p class="text-sm text-slate-400 mt-3">' + t('noTickets') + '</p></div>';
      refreshIcons();
      fetchSupportBadge();
    } catch (e) { host.innerHTML = ''; toast(e.message, 'error'); }
  }

  function ticketThreadHtml(tk) {
    const bubbles = (tk.messages || []).map((m) =>
      '<div class="flex ' + (m.s === 'u' ? 'justify-start' : 'justify-end') + '">' +
      '<div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-6 whitespace-pre-wrap ' +
      (m.s === 'u' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-brand-500 text-white') + '">' +
      (m.s === 'u' ? '' : '<div class="text-[10px] font-bold mb-0.5 opacity-80">' + t('adminLbl') + '</div>') +
      esc(m.t) + '<div class="text-[9px] mt-1 opacity-50" dir="ltr">' + new Date(m.at).toLocaleTimeString(loc()) + '</div></div></div>'
    ).join('');
    return '<div class="p-5">' +
      '<div class="flex items-center gap-3 mb-4">' +
      '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 text-white text-sm font-bold flex items-center justify-center">' + esc((tk.userName || '?').slice(0, 1).toUpperCase()) + '</div>' +
      '<div class="flex-1"><h3 class="font-bold text-sm">' + esc(tk.userName || tk.userId) + '</h3>' +
      '<p class="text-[11px] text-slate-400" dir="ltr">' + esc(tk.userId) + '</p></div>' +
      (tk.open ? chip('bg-emerald-500/10 text-emerald-500', t('open')) : chip('bg-slate-500/10 text-slate-400', t('closed'))) + '</div>' +
      '<div class="space-y-2.5 max-h-[45vh] overflow-y-auto p-1 mb-4" dir="auto">' + (bubbles || '<p class="text-center text-xs text-slate-400 py-4">—</p>') + '</div>' +
      '<textarea id="sup-reply" rows="3" maxlength="3000" class="' + CLS.input + '" placeholder="' + t('replyPh') + '"></textarea>' +
      '<div class="flex justify-between gap-2 mt-4">' +
      '<button data-act="supClose" data-id="' + esc(tk.userId) + '" class="' + CLS.btnS + ' text-rose-500"><i data-lucide="check-circle-2" class="w-4 h-4"></i>' + t('closeTicket') + '</button>' +
      '<div class="flex gap-2">' +
      '<button data-act="modalClose" class="' + CLS.btnS + '">' + t('close') + '</button>' +
      '<button data-act="supReply" data-id="' + esc(tk.userId) + '" class="' + CLS.btnP + '"><i data-lucide="send" class="w-4 h-4"></i>' + t('sendReply') + '</button></div></div></div>';
  }

  async function openTicket(id) {
    openModal('<div class="p-6"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto text-slate-400"></i></div>');
    try {
      const d = await api('/support/tickets/' + encodeURIComponent(id));
      MODAL.ctx = { id };
      openModal(ticketThreadHtml(d.ticket));
    } catch (e) { closeModal(); toast(e.message, 'error'); }
  }

  async function supReply(id) {
    const text = $('sup-reply').value.trim();
    if (!text) return;
    const btn = document.querySelector('[data-act="supReply"]');
    btn.disabled = true;
    try {
      const d = await api('/support/tickets/' + encodeURIComponent(id) + '/reply', { method: 'POST', body: { text } });
      openModal(ticketThreadHtml(d.ticket));
      toast(d.delivered ? t('delivered') : t('notDelivered'), d.delivered ? 'success' : 'info');
      fetchSupportBadge();
    } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
  }

  async function supClose(id) {
    try {
      await api('/support/tickets/' + encodeURIComponent(id) + '/close', { method: 'POST' });
      toast(t('ticketClosed'), 'success');
      closeModal();
      loadTickets();
      fetchSupportBadge();
    } catch (e) { toast(e.message, 'error'); }
  }

  // ===== Creator support channel (panel ↔ creator) =====
  const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
  async function creatorState() {
    try { CR.state = await api('/creator/state'); } catch (e) { CR.state = null; }
    creatorBadge();
    return CR.state;
  }
  function creatorBadge() {
    const n = CR.state ? (CR.state.unread || 0) : 0;
    document.querySelectorAll('[data-act="creatorSupport"]').forEach((b) => {
      if (!(b instanceof HTMLElement)) return;
      let dot = b.querySelector('.cr-dot');
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'cr-dot absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center';
        b.style.position = 'relative';
        b.appendChild(dot);
      }
      dot.textContent = n > 99 ? '99+' : String(n);
      dot.style.display = n === 0 ? 'none' : 'flex';
    });
  }
  function creatorThreadHtml() {
    const thread = (CR.state && CR.state.thread) || [];
    return thread.length
      ? thread.map((m) =>
          '<div class="flex ' + (m.dir === 'in' ? 'justify-start' : 'justify-end') + '">' +
          '<div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-6 whitespace-pre-wrap ' +
          (m.dir === 'in' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100' : 'bg-brand-500 text-white') + '">' + esc(m.text) +
          '<div class="text-[9px] mt-1 opacity-50" dir="ltr">' + new Date(m.at).toLocaleTimeString(loc()) + '</div></div></div>'
        ).join('')
      : '<p class="text-center text-xs text-slate-400 py-8">' + t('creatorEmpty') + '</p>';
  }
  function openCreatorChat() {
    openModal(
      '<div class="flex flex-col" style="height:min(72vh,540px)">' +
      '<div class="flex items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">' +
      '<h3 class="font-bold text-sm flex items-center gap-2"><i data-lucide="life-buoy" class="w-4 h-4 text-brand-500"></i>' + t('creatorChatTitle') + '</h3>' +
      '<button data-act="modalClose" class="' + CLS.iconBtn + '"><i data-lucide="x" class="w-4 h-4"></i></button></div>' +
      '<div id="cr-thread" class="flex-1 overflow-y-auto p-4 space-y-2.5">' + creatorThreadHtml() + '</div>' +
      '<div class="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">' +
      '<input id="cr-input" maxlength="4000" placeholder="' + t('creatorInputPh') + '" class="' + CLS.input + ' flex-1">' +
      '<button data-act="creatorSend" class="' + CLS.btnP + ' shrink-0"><i data-lucide="send" class="w-4 h-4"></i><span class="hidden sm:inline">' + t('creatorSend') + '</span></button>' +
      '</div></div>'
    );
    refreshIcons();
    api('/creator/read', { method: 'POST' }).catch(() => {});
    creatorState();
    if (CR.poll) { clearInterval(CR.poll); CR.poll = null; }
    CR.poll = setInterval(() => {
      if (!$('cr-thread')) { clearInterval(CR.poll); CR.poll = null; return; }
      refreshCreatorThread();
    }, 5000);
  }
  async function refreshCreatorThread() {
    await creatorState();
    const host = $('cr-thread');
    if (host) { host.innerHTML = creatorThreadHtml(); host.scrollTop = host.scrollHeight; }
  }
  async function creatorSend() {
    const input = $('cr-input');
    const text = (input ? input.value : '').trim();
    if (!text) return;
    const btn = document.querySelector('[data-act="creatorSend"]');
    if (btn) btn.disabled = true;
    try {
      await api('/creator/support', { method: 'POST', body: { text } });
      if (input) input.value = '';
      await refreshCreatorThread();
    } catch (e) { toast(e.message, 'error'); }
    if (btn && btn.isConnected) btn.disabled = false;
  }
  function creatorDismissUpdateIfChecked() {
    if ($('cr-never') && $('cr-never').checked) {
      api('/creator/dismiss', { method: 'POST', body: { kind: 'update' } }).catch(() => {});
    }
  }
  function creatorMaybePopup() {
    if (!CR.state) return;
    const s = CR.state;
    if (s.update && s.update.id && (!s.dismiss || s.dismiss.update !== s.update.id)) {
      if (ssGet('cr_update_later_' + s.update.id)) return;
      showCreatorUpdate(s.update);
      return;
    }
    if (s.notice && s.notice.id && (!s.dismiss || s.dismiss.notice !== s.notice.id)) {
      showCreatorNotice(s.notice);
    }
  }
  function showCreatorUpdate(upd) {
    MODAL.ctx = { updateId: upd.id };
    openModal(
      '<div class="p-6">' +
      '<div class="flex items-center gap-3 mb-4">' +
      '<div class="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0"><i data-lucide="rocket" class="w-5 h-5"></i></div>' +
      '<h3 class="font-bold text-lg">' + t('updateTitle') + '</h3></div>' +
      '<div class="whitespace-pre-wrap text-sm leading-7 max-h-[40vh] overflow-y-auto text-slate-600 dark:text-slate-300">' + esc(upd.text || '') + '</div>' +
      '<label class="flex items-center gap-2.5 mt-4 text-xs text-slate-500 cursor-pointer">' +
      '<input type="checkbox" id="cr-never" class="w-4 h-4 accent-brand-500">' + t('updateNever') + '</label>' +
      '<div class="flex flex-wrap justify-end gap-2 mt-5">' +
      '<button data-act="creatorUpdateLater" class="' + CLS.btnS + '">' + t('updateLater') + '</button>' +
      '<button data-act="creatorUpdateGo" class="' + CLS.btnP + '"><i data-lucide="external-link" class="w-4 h-4"></i>' + t('updateDo') + '</button>' +
      '</div></div>'
    );
    refreshIcons();
  }
  function showCreatorNotice(ntc) {
    MODAL.ctx = { noticeId: ntc.id };
    openModal(
      '<div class="p-6">' +
      '<h3 class="font-bold flex items-center gap-2 mb-3"><i data-lucide="megaphone" class="w-4 h-4 text-brand-500"></i>' + t('noticeTitle') + '</h3>' +
      '<div class="whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">' + esc(ntc.text || '') + '</div>' +
      '<div class="flex justify-end mt-5"><button data-act="creatorNoticeOk" class="' + CLS.btnP + '">' + t('noticeGotIt') + '</button></div>' +
      '</div>'
    );
    refreshIcons();
  }

  const BTN_TYPES = [
    ['url', t('typeUrl')],
    ['callback', t('typeCallback')],
    ['submenu', t('typeSubmenu')],
    ['text', t('typeText')],
  ];

  function ctxButtons() {
    if (!MU.menu) return [];
    if (MU.sub) {
      const sm = MU.menu.submenus[MU.sub] || (MU.menu.submenus[MU.sub] = { title: '', text: '', buttons: [] });
      if (!Array.isArray(sm.buttons)) sm.buttons = [];
      return sm.buttons;
    }
    if (!Array.isArray(MU.menu.inlineButtons)) MU.menu.inlineButtons = [];
    return MU.menu.inlineButtons;
  }

  function renderMenu() {
    // Buttons are stored per bot (managed bots included). If the selected bot
    // changed since the menu was loaded, drop the cached editor so the displayed
    // and saved buttons always belong to the currently selected bot.
    const activeBot = localStorage.getItem('bp_managed_bot') || '';
    if (MU.menu && (MU.bot || '') !== activeBot) { MU.menu = null; MU.sub = null; }
    MU.bot = activeBot;
    $('view').innerHTML =
      '<p class="text-sm text-slate-500 -mt-2 mb-4 px-1">' + t('menuHint') + '</p>' +
      '<div id="menu-editor" class="space-y-4"></div>' +
      '<div class="flex gap-2 mt-4">' +
      '<button data-act="menuSave" class="' + CLS.btnP + '"><i data-lucide="save" class="w-4 h-4"></i>' + t('save') + '</button>' +
      '<button data-act="menuReset" class="' + CLS.btnS + '"><i data-lucide="rotate-ccw" class="w-4 h-4"></i>' + t('resetDefaults') + '</button>' +
      '</div>';

    refreshIcons();
    if (!MU.menu) loadMenu();
    else renderMenuEditor();
  }

  async function loadMenu() {
    try {
      const d = await api('/menu');
      MU.menu = d.menu;
      MU.defaults = d.defaults;
      MU.bot = localStorage.getItem('bp_managed_bot') || '';
      renderMenuEditor();
    } catch (e) { toast(e.message, 'error'); }
  }

  function btnValueEl(b) {
    if (b.type === 'submenu') {
      const entries = Object.entries(MU.menu.submenus || {}).filter(([id]) => id !== MU.sub);
      const opts = entries.length
        ? entries.map(([id, sm]) => [id, (sm.title || id) + ' (' + id + ')'])
        : [['', t('valSubmenu')]];
      return ddHtml({ current: b.value, inputCls: 'ib-v', wrapCls: 'col-span-2 sm:col-span-1', btnCls: '!py-2 !bg-white dark:!bg-slate-800', options: opts });
    }
    const ph = b.type === 'url' ? t('valueUrl') : b.type === 'text' ? t('valText') : t('valueCb');
    return '<input dir="ltr" class="ib-v ' + CLS.input + ' !py-2 !bg-white dark:!bg-slate-800 col-span-2 sm:col-span-1" placeholder="' + ph + '" value="' + esc(b.value) + '">';
  }

  function renderBtnEditor() {
    const host = $('btn-editor');
    if (!host || !MU.menu) return;
    const rows = ctxButtons();

    let inner = rows.length
      ? rows.map((row, ri) =>
          '<div class="ib-row rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3" data-r="' + ri + '">' +
          '<div class="flex items-center justify-between mb-2.5">' +
          '<span class="text-[11px] font-bold text-slate-400">' + t('rowLbl') + ' ' + fmtNum(ri + 1) + ' · ' + fmtNum(row.length) + ' ' + t('btnsCount') + '</span>' +
          (row.length >= 8 ? '<span class="text-[10px] text-amber-500">MAX 8</span>' : '') +
          '</div>' +
          '<div class="space-y-2">' + row.map((b, bi) => btnCard(b, ri, bi, row.length, rows.length)).join('') + '</div></div>'
        ).join('')
      : '<p class="text-xs text-slate-400 mb-3">' + t('none') + '</p>';

    inner += '<button data-act="btnAddOpen" class="' + CLS.btnP + ' text-xs !py-2"><i data-lucide="plus" class="w-3.5 h-3.5"></i>' + t('addBtnTitle') + '</button>' +
      '<p class="text-[11px] text-slate-400 mt-2.5">' + t('posHint') + '</p>';
    host.innerHTML = inner;
    refreshIcons();
  }

  function btnCard(b, ri, bi, rowLen, rowsLen) {
    const mv = (dir, icon, key, dis) =>
      '<button data-act="btnMove" data-r="' + ri + '" data-b="' + bi + '" data-dir="' + dir + '" title="' + t(key) + '" class="' + CLS.iconBtn + ' !p-1.5' + (dis ? ' opacity-25 pointer-events-none' : '') + '"><i data-lucide="' + icon + '" class="w-3.5 h-3.5"></i></button>';
    return '<div class="ib-card p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto] gap-2 items-center" data-b="' + bi + '">' +
      '<input class="ib-t ' + CLS.input + ' !py-2 !bg-white dark:!bg-slate-800" placeholder="' + t('btnText') + '" value="' + esc(b.text) + '">' +
      ddHtml({ current: b.type, inputCls: 'ib-type', btnCls: '!py-2 !bg-white dark:!bg-slate-800', options: BTN_TYPES }) +
      btnValueEl(b) +
      '<div class="flex items-center justify-end gap-0.5 col-span-2 sm:col-span-1">' +
      mv('u', 'chevron-up', 'moveU', ri === 0) +
      mv('l', 'chevron-left', 'moveL', bi === 0) +
      mv('r', 'chevron-right', 'moveR', bi === rowLen - 1) +
      mv('d', 'chevron-down', 'moveD', ri === rowsLen - 1) +
      '<button data-act="ibDelBtn" data-r="' + ri + '" data-b="' + bi + '" class="' + CLS.iconBtn + ' !p-1.5 text-rose-400"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>' +
      '</div></div>';
  }

  function modalValueEl(type) {
    if (type === 'submenu') {
      const ids = Object.entries(MU.menu.submenus || {}).filter(([id]) => id !== MU.sub);
      const opts = ids.length
        ? ids.map(([id, sm]) => [id, (sm.title || id) + ' (' + id + ')'])
        : [['', t('valSubmenu')]];
      return ddHtml({ id: 'bm-value', current: opts[0][0], options: opts });
    }
    const ph = type === 'url' ? t('valueUrl') : type === 'text' ? t('valText') : t('valueCb');
    return '<input id="bm-value" dir="ltr" class="' + CLS.input + '" placeholder="' + ph + '">';
  }

  function openBtnModal() {
    syncMenuSafe();
    const rows = ctxButtons();
    const rowOpts = rows.map((r, i) =>
      [String(i), t('rowLbl') + ' ' + fmtNum(i + 1) + ' (' + fmtNum(r.length) + ' ' + t('btnsCount') + ')']);
    rowOpts.push(['new', t('newRowOpt')]);
    openModal(
      '<div class="p-6">' +
      '<h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="plus-circle" class="w-4 h-4 text-brand-500"></i>' + t('addBtnTitle') + '</h3>' +
      '<div class="space-y-3">' +
      '<div><label class="' + CLS.label + '">' + t('btnText') + '</label>' +
      '<input id="bm-text" maxlength="64" class="' + CLS.input + '"></div>' +
      '<div><label class="' + CLS.label + '">' + t('btnType') + '</label>' +
      ddHtml({ id: 'bm-type', current: 'url', options: BTN_TYPES }) + '</div>' +
      '<div><label class="' + CLS.label + '">' + t('value') + '</label>' +
      '<div id="bm-value-box">' + modalValueEl('url') + '</div></div>' +
      '<div class="grid grid-cols-2 gap-3">' +
      '<div><label class="' + CLS.label + '">' + t('rowLbl') + '</label>' +
      ddHtml({ id: 'bm-row', current: rowOpts[0][0], options: rowOpts }) + '</div>' +
      '<div><label class="' + CLS.label + '">' + t('colLbl') + '</label>' +
      '<input id="bm-col" type="number" min="1" class="' + CLS.input + '" placeholder="⟵ ' + t('endOfRow') + '"></div></div>' +
      '</div>' +
      '<p class="text-[11px] text-slate-400 mt-3">' + t('posHint') + '</p>' +
      '<div class="flex justify-end gap-2 mt-5">' +
      '<button data-act="modalClose" class="' + CLS.btnS + '">' + t('cancel') + '</button>' +
      '<button data-act="btnModalAdd" class="' + CLS.btnP + '"><i data-lucide="plus" class="w-4 h-4"></i>' + t('addBtn') + '</button></div></div>'
    );
  }

  function renderMenuEditor() {
    const host = $('menu-editor');
    if (!host || !MU.menu) return;
    ddClose();
    const m = MU.menu;
    const ta = (id, label, val) =>
      '<div><label class="' + CLS.label + '">' + label + '</label>' +
      '<textarea id="' + id + '" rows="4" class="' + CLS.input + '">' + esc(val) + '</textarea></div>';
    const hint = '<p class="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5"><i data-lucide="braces" class="w-3.5 h-3.5"></i>' + t('tplHint') + '</p>';
    const startBody =
      '<div class="grid sm:grid-cols-2 gap-4">' + ta('wm-fa', t('welcomeFa'), m.welcome.fa) + ta('wm-en', t('welcomeEn'), m.welcome.en) + '</div>' + hint;
    const helpBody =
      '<div class="grid sm:grid-cols-2 gap-4">' + ta('hp-fa', t('helpFa'), m.help.fa) + ta('hp-en', t('helpEn'), m.help.en) + '</div>' + hint;

    let subsBody;
    if (MU.sub) {
      const sm = m.submenus[MU.sub] || { title: '', text: '', buttons: [] };
      subsBody =
        '<div class="flex items-center justify-between mb-4">' +
        '<button data-act="subBack" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">← ' + t('backToList') + '</button>' +
        '<button data-act="subDel" data-id="' + esc(MU.sub) + '" class="' + CLS.iconBtn + ' !p-1.5 text-rose-400" title="' + t('remove') + '"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>' +
        '<span class="' + CLS.chip + ' bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-3 inline-flex"><i data-lucide="folder-pen" class="w-3.5 h-3.5"></i>' + t('subEdit') + ' — <span dir="ltr">' + esc(MU.sub) + '</span></span>' +
        '<div class="grid sm:grid-cols-2 gap-4 mt-3">' +
        '<div><label class="' + CLS.label + '">' + t('subTitle') + '</label><input id="sm-title" class="' + CLS.input + '" maxlength="64" value="' + esc(sm.title) + '"></div>' +
        '<div><label class="' + CLS.label + '">' + t('subText') + '</label><input id="sm-text" class="' + CLS.input + '" value="' + esc(sm.text) + '"></div></div>' +
        '<h4 class="text-xs font-bold uppercase tracking-wide text-slate-500 mt-5 mb-2">' + t('pageBtns') + '</h4>' +
        '<div id="btn-editor"></div>' +
        '<p class="text-[11px] text-slate-400 mt-3">' + t('subHint') + '</p>';
    } else {
      const subs = Object.entries(m.submenus || {}).map(([id, sm]) =>
        '<div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">' +
        '<span class="text-sm flex-1 truncate flex items-center gap-1.5"><i data-lucide="folder" class="w-4 h-4 text-brand-500 shrink-0"></i><span class="truncate">' + esc(sm.title || id) + '</span>' + ' <span class="text-[10px] text-slate-400" dir="ltr">' + esc(id) + '</span></span>' +
        '<span class="text-[10px] text-slate-400">' + fmtNum((sm.buttons || []).flat().length) + ' ' + t('btnsCount') + '</span>' +
        '<button data-act="subEditBtn" data-id="' + esc(id) + '" class="' + CLS.iconBtn + ' !p-1.5" title="' + t('subEdit') + '"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>' +
        '<button data-act="subDel" data-id="' + esc(id) + '" class="' + CLS.iconBtn + ' !p-1.5 text-rose-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></div>'
      ).join('');
      subsBody =
        '<div class="flex items-center justify-between mb-3"><h4 class="text-xs font-bold uppercase tracking-wide text-slate-500">' + t('submenus') + '</h4>' +
        '<button data-act="subNew" class="' + CLS.btnS + ' !py-1.5 !px-3 text-xs"><i data-lucide="plus" class="w-3.5 h-3.5"></i>' + t('subNew') + '</button></div>' +
        '<div class="space-y-2">' + (subs || '<p class="text-xs text-slate-400">' + t('none') + '</p>') + '</div>' +
        '<p class="text-[11px] text-slate-400 mt-3">' + t('subHint') + '</p>';
    }

    host.innerHTML =
      accCard('menu', 'start', 'message-circle', t('startText'), startBody) +
      accCard('menu', 'help', 'info', t('helpText'), helpBody) +
      (!MU.sub ? accCard('menu', 'inline', 'link-2', t('inlineTab'), '<h4 class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">' + t('pageBtns') + '</h4><div id="btn-editor"></div>') : '') +
      accCard('menu', 'subs', 'folder-tree', t('submenus'), subsBody);

    renderBtnEditor();
    refreshIcons();
  }

  function syncMenuDom() {
    if (!MU.menu) return;
    const m = MU.menu;
    if ($('wm-fa') && $('wm-en')) {
      m.welcome.fa = $('wm-fa').value;
      m.welcome.en = $('wm-en').value;
    }
    if ($('hp-fa') && $('hp-en')) {
      m.help.fa = $('hp-fa').value;
      m.help.en = $('hp-en').value;
    }
    if (MU.sub) {
      const sm = m.submenus[MU.sub];
      if (!sm) return;
      if ($('sm-title')) sm.title = $('sm-title').value;
      if ($('sm-text')) sm.text = $('sm-text').value;
      if (document.querySelector('#btn-editor')) sm.buttons = readIbRows();
    } else if (document.querySelector('#btn-editor')) {
      m.inlineButtons = readIbRows();
    }
  }

  function readIbRows() {
    const host = document.querySelector('#btn-editor');
    if (!host) return [];
    return [...host.querySelectorAll('.ib-row')].map((rowEl) =>
      [...rowEl.querySelectorAll('.ib-card')].map((bEl) => ({
        text: bEl.querySelector('.ib-t').value,
        type: bEl.querySelector('.ib-type').value,
        value: bEl.querySelector('.ib-v') ? bEl.querySelector('.ib-v').value : '',
      })).filter((b) => b.text)
    ).filter((r) => r.length);
  }

  function themeBtn(v, icon, label, bg, accent) {
    return '<button data-act="setTheme" data-v="' + v + '" class="preftheme ' + CLS.btnS + ' !py-2.5 text-xs !flex-col !gap-1.5">' +
      '<span class="flex items-center gap-1.5">' +
      '<span class="w-6 h-6 rounded-lg border border-black/20 dark:border-white/20" style="background:' + bg + '"></span>' +
      '<span class="w-6 h-6 rounded-lg" style="background:' + accent + '"></span></span>' +
      '<span class="flex items-center gap-1 font-bold"><i data-lucide="' + icon + '" class="w-3.5 h-3.5"></i>' + label + '</span></button>';
  }
  const ACC_DEF = {};
  function accOpen(group, id, fallback) {
    try {
      const s = JSON.parse(localStorage.getItem('bp_acc_' + group) || '{}');
      if (s && typeof s[id] === 'boolean') return s[id];
    } catch (e) {}
    if (typeof fallback === 'boolean') return fallback;
    return (ACC_DEF[group] || []).indexOf(id) >= 0;
  }
  function accSet(group, id, open) {
    let s = {};
    try { s = JSON.parse(localStorage.getItem('bp_acc_' + group) || '{}') || {}; } catch (e) {}
    s[id] = !!open;
    try { localStorage.setItem('bp_acc_' + group, JSON.stringify(s)); } catch (e) {}
  }
  function accCard(group, id, icon, title, inner) {
    const open = accOpen(group, id);
    return '<section data-acc="' + group + ':' + id + '" class="bp-sec ' + CLS.card + ' overflow-hidden' + (open ? ' open' : '') + '">' +
      '<button data-act="accToggle" data-group="' + group + '" data-id="' + id + '" aria-expanded="' + open + '" class="w-full flex items-center gap-2 p-5 md:p-6 text-start cursor-pointer">' +
      '<i data-lucide="' + icon + '" class="w-4 h-4 text-brand-500 shrink-0"></i>' +
      '<span class="font-bold text-sm flex-1">' + title + '</span>' +
      '<i data-lucide="chevron-down" class="chev w-4 h-4 text-slate-400 shrink-0"></i></button>' +
      '<div class="bp-sec-body"><div class="bp-sec-inner"><div class="px-5 md:px-6 pb-5 md:pb-6">' + inner + '</div></div></div></section>';
  }
  function secCard(id, icon, title, inner) { return accCard('set', id, icon, title, inner); }
  // Collapsible section. Optional action buttons render inside the body (below the
  // content), keeping the header row a plain expand/collapse toggle.
  function accPanel(group, id, title, inner, buttons, opts) {
    const o = opts || {};
    const open = accOpen(group, id, o.open !== false);
    return '<section data-acc="' + group + ':' + id + '" class="bp-sec ' + CLS.card + ' overflow-hidden' + (open ? ' open' : '') + '">' +
      '<div class="flex items-center gap-2 p-5 md:p-6">' +
      '<button type="button" data-act="accToggle" data-group="' + group + '" data-id="' + id + '" aria-expanded="' + open + '" class="flex items-center gap-2 flex-1 min-w-0 text-start cursor-pointer">' +
      (o.icon ? '<i data-lucide="' + o.icon + '" class="w-4 h-4 text-brand-500 shrink-0"></i>' : '') +
      '<span class="text-sm font-bold flex-1 min-w-0">' + title + '</span>' +
      '<i data-lucide="chevron-down" class="chev w-4 h-4 text-slate-400 shrink-0"></i></button>' +
      '</div>' +
      '<div class="bp-sec-body"><div class="bp-sec-inner"><div class="px-5 md:px-6 pb-5 md:pb-6">' + inner +
      (buttons ? '<div class="sec-actions mt-4 flex gap-2 flex-wrap">' + buttons + '</div>' : '') +
      '</div></div></div></section>';
  }
  function ddHtml(o) {
    const cur = o.options.some((x) => String(x[0]) === String(o.current)) ? String(o.current) : String(o.options[0][0]);
    const curLbl = (o.options.filter((x) => String(x[0]) === cur)[0] || o.options[0])[1];
    const opts = o.options.map((x) => {
      const on = String(x[0]) === cur;
      return '<button type="button" data-act="ddPick" data-v="' + esc(x[0]) + '" data-lbl="' + esc(x[1]) + '" role="option" aria-selected="' + on + '" class="dd-opt' + (on ? ' sel' : '') + '">' +
        '<span class="flex-1 truncate">' + esc(x[1]) + '</span><span class="dd-check">\u2713</span></button>';
    }).join('');
    return '<div class="bp-dd relative min-w-0' + (o.wrapCls ? ' ' + o.wrapCls : '') + '">' +
      '<input type="hidden"' + (o.id ? ' id="' + o.id + '"' : '') + ' value="' + esc(cur) + '"' + (o.inputCls ? ' class="' + o.inputCls + '"' : '') + '>' +
      '<button type="button" data-act="ddToggle" aria-haspopup="listbox" aria-expanded="false" class="' + CLS.input + ' flex items-center justify-between gap-2 cursor-pointer' + (o.btnCls ? ' ' + o.btnCls : '') + '">' +
      '<span class="dd-label flex-1 truncate text-start">' + esc(curLbl) + '</span>' +
      '<i data-lucide="chevron-down" class="dd-chev w-4 h-4 shrink-0 text-slate-400"></i></button>' +
      '<div class="dd-src hidden">' + opts + '</div></div>';
  }
  function paintDropdowns(root) {
    const scope = root || document;
    const boxes = [];
    // A single box can be passed in directly, so the scope itself has to be considered:
    // querySelectorAll never returns the element it is called on.
    if (scope.nodeType === 1 && scope.classList && scope.classList.contains('bp-dd')) boxes.push(scope);
    scope.querySelectorAll('.bp-dd').forEach((b) => boxes.push(b));
    boxes.forEach((box) => {
      const input = box.querySelector('input[type="hidden"]');
      const label = box.querySelector('.dd-label');
      if (!input || !label) return;
      const v = String(input.value);
      let lbl = null;
      box.querySelectorAll('.dd-src .dd-opt').forEach((x) => {
        const on = String(x.getAttribute('data-v')) === v;
        x.classList.toggle('sel', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) lbl = x.getAttribute('data-lbl');
      });
      if (lbl != null) label.textContent = lbl;
    });
  }
  function ddOpen(box) {
    const panel = $('dd-panel');
    const src = box.querySelector('.dd-src');
    const btn = box.querySelector('[data-act="ddToggle"]');
    if (!panel || !src || !btn) return;
    ddClose();
    paintDropdowns(box);
    panel.innerHTML = src.innerHTML;
    panel.classList.remove('hidden');
    panel.classList.remove('dd-in');
    void panel.offsetWidth;
    panel.classList.add('dd-in');
    DD.openBox = box;
    DD.lastBox = box;
    btn.setAttribute('aria-expanded', 'true');
    const ch = btn.querySelector('.dd-chev');
    if (ch) ch.classList.add('rot');
    positionDropdown();
  }
  function positionDropdown() {
    const panel = $('dd-panel');
    const btn = DD.openBox?.querySelector('[data-act="ddToggle"]');
    if (!btn || !btn.isConnected) return ddClose();
    const r = btn.getBoundingClientRect();
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    if (r.bottom < -40 || r.top > vh + 40) return ddClose();
    const w = Math.max(Math.round(r.width), 180);
    panel.style.width = w + 'px';
    panel.style.minWidth = '';
    panel.style.maxWidth = (window.innerWidth - 16) + 'px';
    panel.style.left = Math.max(8, Math.min(Math.round(r.left), window.innerWidth - w - 8)) + 'px';
    const maxH = 260;
    const need = Math.min(panel.scrollHeight, maxH);
    const below = vh - r.bottom - 8;
    const above = r.top - 8;
    if (below >= need || below >= above) {
      panel.style.top = Math.round(r.bottom + 6) + 'px';
      panel.style.bottom = 'auto';
      panel.style.maxHeight = Math.max(120, Math.min(maxH, below - 6)) + 'px';
    } else {
      panel.style.top = 'auto';
      panel.style.bottom = Math.round(vh - r.top + 6) + 'px';
      panel.style.maxHeight = Math.max(120, Math.min(maxH, above - 6)) + 'px';
    }
  }
  function ddClose() {
    const panel = $('dd-panel');
    if (panel) { panel.classList.add('hidden'); panel.innerHTML = ''; }
    if (DD.openBox) {
      const b = DD.openBox.querySelector('[data-act="ddToggle"]');
      if (b) {
        b.setAttribute('aria-expanded', 'false');
        const c = b.querySelector('.dd-chev');
        if (c) c.classList.remove('rot');
      }
      DD.openBox = null;
    }
  }
  function paintSecAll() {
    const btn = $('sec-all-btn');
    if (!btn) return;
    const boxes = Array.prototype.slice.call(document.querySelectorAll('section.bp-sec'));
    const allOpen = boxes.length > 0 && boxes.every((b) => b.classList.contains('open'));
    btn.textContent = allOpen ? t('collapseAll') : t('expandAll');
  }
  function renderSettings() {
    const allOpen = ['general', 'security', 'channel', 'webhook', 'tuning', 'prefs'].every((id) => accOpen('set', id));
    $('view').innerHTML =
      '<div class="flex justify-end mb-3 px-1">' +
      '<button id="sec-all-btn" data-act="secAll" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">' + (allOpen ? t('collapseAll') : t('expandAll')) + '</button></div>' +
      '<div class="grid lg:grid-cols-2 gap-4 items-start">' +
      secCard('general', 'bot', t('botSettings'),
      '<div id="st-wh-warn" class="mb-4"></div>' +
      '<div class="mb-4"><label class="' + CLS.label + '">' + t('botToken') + '</label>' +
      '<p id="st-token-cur" class="text-xs mb-2 break-all"></p>' +
      '<input id="st-token-in" dir="ltr" type="password" autocomplete="off" placeholder="123456:ABC-DEF…" class="' + CLS.input + '">' +
      '<p class="text-[11px] text-slate-400 mt-1.5">' + t('tokenHint') + '</p></div>' +
      '<div class="mb-4"><label class="' + CLS.label + '">' + (S.lang === 'en' ? 'Admin Numeric Telegram ID (for Mini App)' : 'آیدی عددی ادمین (برای ورود بدون رمز مینی‌اپ)') + '</label>' +
      '<input id="st-admin-id" dir="ltr" placeholder="123456789" class="' + CLS.input + '">' +
      '<p class="text-[11px] text-slate-400 mt-1.5">' + (S.lang === 'en' ? 'Your numeric Telegram ID (send /id to bot). Allows instant admin login when opened inside Telegram Mini App.' : 'شناسه عددی اکانت تلگرام شما (با ارسال /id به ربات دریافت کنید). با تنظیم این آیدی، مینی‌اپ داخل تلگرام بدون نیاز به رمز ورود باز می‌شود.') + '</p></div>' +
'<div class="mb-4"><label class="' + CLS.label + '">' + t('botLang') + '</label>' +
      ddHtml({ id: 'st-langmode', current: 'both', options: [['both', t('langBoth')], ['fa', t('langFaOnly')], ['en', t('langEnOnly')]] }) + '</div>' +
      '<div class="mb-4" id="deflang-wrap"><label class="' + CLS.label + '">' + t('defaultBotLang') + '</label>' +
      ddHtml({ id: 'st-lang', current: 'fa', options: [['fa', 'فارسی'], ['en', 'English']] }) +
      '<p class="text-[11px] text-slate-400 mt-1.5">' + t('defLangHint') + '</p></div>' +
      '<div class="mb-5"><label class="flex items-center gap-2.5 cursor-pointer text-sm">' +
      '<input id="st-sb-on" type="checkbox" class="w-4 h-4 accent-brand-500">' + t('supportAlways') + '</label>' +
      '<div class="grid sm:grid-cols-2 gap-3 mt-3">' +
      '<input id="st-sb-fa" maxlength="64" placeholder="' + t('sbFaPh') + '" class="' + CLS.input + '">' +
      '<input id="st-sb-en" dir="ltr" maxlength="64" placeholder="' + t('sbEnPh') + '" class="' + CLS.input + '"></div></div>' +
      '<button data-act="saveGeneral" class="' + CLS.btnP + '"><i data-lucide="save" class="w-4 h-4"></i>' + t('save') + '</button>') +

      '<div class="space-y-4">' +
      secCard('security', 'key-round', t('security'),
      '<div class="space-y-3">' +
      '<div><label class="' + CLS.label + '">' + t('currentPw') + '</label>' +
      '<input id="st-cur-pw" type="password" autocomplete="current-password" class="' + CLS.input + '"></div>' +
      '<div class="grid sm:grid-cols-2 gap-3">' +
      '<div><label class="' + CLS.label + '">' + t('newPw') + '</label>' +
      '<input id="st-new-pw" type="password" autocomplete="new-password" class="' + CLS.input + '"></div>' +
      '<div><label class="' + CLS.label + '">' + t('newPw2') + '</label>' +
      '<input id="st-new-pw2" type="password" autocomplete="new-password" class="' + CLS.input + '"></div></div>' +
      '<p class="text-[11px] text-slate-400">' + t('sessionsNote') + '</p></div>' +
      '<button data-act="changePw" class="' + CLS.btnP + ' mt-4"><i data-lucide="key-round" class="w-4 h-4"></i>' + t('changePw') + '</button>') +
      secCard('channel', 'lock', t('channelLock'),
      '<label class="flex items-center gap-2.5 mb-4 text-sm cursor-pointer">' +
      '<input id="st-ch-on" type="checkbox" class="w-4 h-4 accent-brand-500">' + t('chEnable') + '</label>' +
      '<div class="mb-3"><label class="' + CLS.label + '">' + t('chId') + '</label>' +
      '<input id="st-ch-id" dir="ltr" placeholder="@mychannel" class="' + CLS.input + '"></div>' +
      '<div class="mb-3"><label class="' + CLS.label + '">' + t('chUrl') + '</label>' +
      '<input id="st-ch-url" dir="ltr" placeholder="https://t.me/…" class="' + CLS.input + '"></div>' +
      '<p class="text-[11px] text-slate-400 flex items-center gap-1.5"><i data-lucide="triangle-alert" class="w-3.5 h-3.5 text-amber-500 shrink-0"></i><span>' + t('chHint') + '</span></p>' +
      '<button data-act="saveChannel" class="' + CLS.btnP + ' mt-4"><i data-lucide="save" class="w-4 h-4"></i>' + t('save') + '</button>') +
      secCard('webhook', 'webhook', t('webhookMgmt'),
      '<div id="st-wh-box" class="mb-4"><div class="py-4 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block"></i></div></div>' +
      '<div class="flex gap-2">' +
      '<button data-act="setWebhook" data-action="set" class="' + CLS.btnP + '"><i data-lucide="plug-zap" class="w-4 h-4"></i>' + t('setWebhook') + '</button>' +
      '<button data-act="setWebhook" data-action="delete" class="' + CLS.btnS + ' text-rose-500"><i data-lucide="unplug" class="w-4 h-4"></i>' + t('delWebhook') + '</button></div>') +
      secCard('tuning', 'gauge', t('broadcastTuning'),
      '<div class="grid grid-cols-2 gap-3">' +
      '<div><label class="' + CLS.label + '">' + t('batchSize') + '</label><input id="st-batch" type="number" min="1" max="50" class="' + CLS.input + '"></div>' +
      '<div><label class="' + CLS.label + '">' + t('delayMs') + '</label><input id="st-delay" type="number" min="20" max="500" step="10" class="' + CLS.input + '"></div></div>' +
      '<button data-act="saveTuning" class="' + CLS.btnS + ' mt-4"><i data-lucide="save" class="w-4 h-4"></i>' + t('save') + '</button>') +
      secCard('prefs', 'sliders-horizontal', t('panelPrefs'),
      '<div class="space-y-4">' +
      '<div><span class="' + CLS.label + '">' + t('appearance') + '</span>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">' +
      themeBtn('dark', 'moon', t('dark'), '#020617', '#2aabee') +
      themeBtn('light', 'sun', t('light'), '#f1f5f9', '#2aabee') +
      themeBtn('ocean', 'waves', t('themeOcean'), '#0a2036', '#06b6d4') +
      themeBtn('violet', 'sparkles', t('themeViolet'), '#1b1740', '#8b5cf6') +
      themeBtn('forest', 'leaf', t('themeForest'), '#0a2318', '#10b981') +
      themeBtn('sunset', 'sunset', t('themeSunset'), '#211309', '#f59e0b') +
      '</div></div>' +
      '<div><span class="' + CLS.label + '">' + t('language') + '</span>' +
      '<div class="flex gap-2">' +
      '<button data-act="setLang" data-v="fa" class="preflang ' + CLS.btnS + ' flex-1 !py-2 text-xs">فارسی</button>' +
      '<button data-act="setLang" data-v="en" class="preflang ' + CLS.btnS + ' flex-1 !py-2 text-xs">English</button></div></div></div>') +
      '</div></div>';

    refreshIcons();
    loadSettings();
  }

  function paintWebhookWarning(st, wh) {
    const host = $('st-wh-warn');
    if (!host) return;
    const needsWebhook = st && st.hasToken && !(wh && wh.configured);
    host.innerHTML = needsWebhook
      ? '<div class="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5">' +
        '<i data-lucide="triangle-alert" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5"></i>' +
        '<div class="min-w-0"><p class="text-xs font-bold text-amber-600 dark:text-amber-400">' + t('webhookWarnTitle') + '</p>' +
        '<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-5 mt-1">' + t('webhookNeeded') + '</p>' +
        '<button data-act="gotoWebhook" class="' + CLS.btnS + ' !py-1.5 !px-3 !text-xs mt-2.5"><i data-lucide="plug-zap" class="w-3.5 h-3.5"></i>' + t('webhookGoSet') + '</button></div></div>'
      : '';
    refreshIcons();
  }
  function gotoWebhookSection() {
    const box = document.querySelector('section[data-acc="set:webhook"]');
    if (box) {
      box.classList.add('open');
      accSet('set', 'webhook', true);
      const head = box.querySelector('[data-act="accToggle"]');
      if (head) head.setAttribute('aria-expanded', 'true');
      paintSecAll();
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      box.classList.add('ring-2', 'ring-amber-500/60');
      setTimeout(() => box.classList.remove('ring-2', 'ring-amber-500/60'), 2600);
    }
  }
  function webhookWarningModal() {
    openModal(
      '<div class="p-6">' +
      '<div class="flex items-start gap-3 mb-4"><span class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"><i data-lucide="triangle-alert" class="w-5 h-5"></i></span>' +
      '<div><h3 class="font-bold">' + t('webhookWarnTitle') + '</h3>' +
      '<p class="text-sm text-slate-500 dark:text-slate-400 leading-6 mt-1.5">' + t('webhookWarnBody') + '</p></div></div>' +
      '<div class="flex flex-wrap justify-end gap-2">' +
      '<button data-act="modalClose" class="' + CLS.btnS + '">' + t('close') + '</button>' +
      '<button data-act="gotoWebhook" class="' + CLS.btnP + '"><i data-lucide="plug-zap" class="w-4 h-4"></i>' + t('webhookGoSet') + '</button>' +
      '</div></div>'
    );
  }

  async function loadSettings() {
    try {
      const [s, dash] = await Promise.all([
        api('/settings'),
        api('/dashboard/stats').catch(() => null),
      ]);
      const st = s.settings;
      $('st-token-cur').innerHTML = st.hasToken
        ? '<span class="text-emerald-500 font-semibold inline-flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-4 h-4"></i>' + t('tokenStored') + '</span> <span class="font-mono text-slate-400" dir="ltr">' + esc(st.tokenMasked) + '</span>'
        : '<span class="text-amber-500 font-semibold inline-flex items-center gap-1.5"><i data-lucide="triangle-alert" class="w-4 h-4"></i>' + t('tokenMissingWarn') + '</span>';
      $('st-langmode').value = st.botLangMode || 'both';
      if ($('st-admin-id')) {
        $('st-admin-id').value = st.adminId || '';
        $('st-admin-id').dataset.orig = st.adminId || '';
      }
      $('st-lang').value = st.defaultLang || 'fa';
      const dw = $('deflang-wrap');
      if (dw) dw.classList.toggle('hidden', (st.botLangMode || 'both') !== 'both');
      const sb = st.supportButton || {};
      $('st-sb-on').checked = sb.enabled !== false;
      $('st-sb-fa').value = sb.fa || '';
      $('st-sb-en').value = sb.en || '';
      $('st-batch').value = (st.broadcast && st.broadcast.batchSize) || 25;
      $('st-delay').value = (st.broadcast && st.broadcast.delayMs) || 40;
      const rc = st.requiredChannel || {};
      $('st-ch-on').checked = !!rc.enabled;
      $('st-ch-id').value = rc.chatId || '';
      $('st-ch-url').value = rc.url || '';
      if (dash && $('st-wh-box')) $('st-wh-box').innerHTML = whBoxHtml(dash.webhook);
      paintWebhookWarning(st, dash && dash.webhook);
      paintPrefs();
      paintDropdowns();
      refreshIcons();
    } catch (e) { toast(e.message, 'error'); }
  }

  function paintPrefs() {
    const cur = getTheme();
    document.querySelectorAll('.preftheme').forEach((b) => {
      const on = b.dataset.v === cur;
      b.classList.toggle('!border-brand-500', on);
      b.classList.toggle('!text-brand-500', on);
    });
    document.querySelectorAll('.preflang').forEach((b) => {
      const on = b.dataset.v === S.lang;
      b.classList.toggle('!border-brand-500', on);
      b.classList.toggle('!text-brand-500', on);
    });
  }

  const ACTIONS = {
    nav: (d) => { if (d.to !== S.route) go(d.to); },
    login: () => doLogin(),
    pwEye: () => { const i = $('pw'); i.type = i.type === 'password' ? 'text' : 'password'; },
    logout: () => doLogout(),
    modalClose: () => closeModal(),
    confirmYes: () => { const r = CF.resolve; CF.resolve = null; closeModal(); r && r(true); },
    confirmNo: () => { const r = CF.resolve; CF.resolve = null; closeModal(); r && r(false); },
    copyTxt: (d) => { navigator.clipboard && navigator.clipboard.writeText(d.txt); toast(t('copied'), 'success'); },
    pingNow: () => ping(),
    dashRefresh: () => loadDashboard(),

    toggleTheme: () => {
      const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
      applyTheme(next);
    },
    setTheme: (d) => {
      applyTheme(d.v);
    },
    toggleLang: () => ACTIONS.setLang({ v: S.lang === 'fa' ? 'en' : 'fa' }),
    setLang: (d) => {
      S.lang = d.v;
      localStorage.setItem('bp_lang', d.v);
      document.documentElement.lang = d.v;
      document.documentElement.dir = d.v === 'fa' ? 'rtl' : 'ltr';
      render();
    },
    accToggle: (d, el) => {
      const box = el && el.closest ? el.closest('section.bp-sec') : null;
      if (!box) return;
      const open = !box.classList.contains('open');
      box.classList.toggle('open', open);
      el.setAttribute('aria-expanded', open ? 'true' : 'false');
      accSet(d.group, d.id, open);
      if (d.group === 'bc' && d.id === 'results' && open && !BC.engLoaded) { BC.engLoaded = true; loadEngagement(); }
    },
    secAll: () => {
      const boxes = Array.prototype.slice.call(document.querySelectorAll('section.bp-sec'));
      if (!boxes.length) return;
      const expand = boxes.some((b) => !b.classList.contains('open'));
      boxes.forEach((b) => {
        b.classList.toggle('open', expand);
        const head = b.querySelector('[data-act="accToggle"]');
        if (head) head.setAttribute('aria-expanded', expand ? 'true' : 'false');
        const k = (b.getAttribute('data-acc') || ':').split(':');
        accSet(k[0], k[1], expand);
      });
      paintSecAll();
    },
    ddToggle: (d, el) => {
      const box = el && el.closest ? el.closest('.bp-dd') : null;
      if (!box) return;
      const panel = $('dd-panel');
      if (DD.openBox === box && panel && !panel.classList.contains('hidden')) { ddClose(); return; }
      ddOpen(box);
    },
    ddPick: (d) => {
      const box = DD.openBox || DD.lastBox;
      ddClose();
      if (!box || !box.isConnected) return;
      const input = box.querySelector('input[type="hidden"]');
      if (!input) return;
      input.value = d.v;
      paintDropdowns(box);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },

    usersSearch: () => loadUsers(true),
    usersRefresh: () => loadUsers(true),
    userPrev: () => { if (UP.stack.length) { UP.cursor = UP.stack.pop(); UP.page--; loadUsers(false); } },
    userNext: () => { if (UP.nextCursor) { UP.stack.push(UP.cursor); UP.cursor = UP.nextCursor; UP.page++; loadUsers(false); } },
    banUser: async (d) => {
      if (!(await confirmDlg(t('banQ'), t('banUser')))) return;
      try { await api('/users/' + encodeURIComponent(d.id) + '/ban', { method: 'POST', body: {} }); toast(t('saved'), 'success'); loadUsers(false); }
      catch (e) { toast(e.message, 'error'); }
    },
    unbanUser: async (d) => {
      try { await api('/users/' + encodeURIComponent(d.id) + '/unban', { method: 'POST' }); toast(t('saved'), 'success'); loadUsers(false); }
      catch (e) { toast(e.message, 'error'); }
    },
    openMsg: (d) => openUserMsg(d.id, d.name),
    sendUserMsg: () => sendUserMsg(),
    userDetail: (d) => openUserDetail(d.id),

    bcAddRow: () => { BC.rows.push([{ text: '', url: '' }]); renderBcRows(); },
    bcDelRow: (d) => { BC.rows.splice(+d.r, 1); renderBcRows(); },
    bcAddBtn: (d) => { BC.rows[+d.r].push({ text: '', url: '' }); renderBcRows(); },
    bcDelBtn: (d) => { BC.rows[+d.r].splice(+d.b, 1); renderBcRows(); },
    bcSend: (d) => bcSend(d),
    bcHistRefresh: () => loadHistory(),
    engRefresh: () => loadEngagement(),
    pollAddOpt: () => { syncPollOpts(); if (BC.pollOpts.length < 10) BC.pollOpts.push(''); renderPollOpts(); },
    pollDelOpt: (d) => { syncPollOpts(); if (BC.pollOpts.length > 2) BC.pollOpts.splice(+d.i, 1); renderPollOpts(); },
    bcPause: async () => {
      if (!BC.jobId) return;
      BC.running = false;
      try { const d = await api('/broadcast/' + BC.jobId + '/pause', { method: 'POST' }); bcPaint(d.job); } catch (e) {}
    },
    bcStop: async () => {
      if (!BC.jobId) return;
      if (!(await confirmDlg(t('confirmStop'), t('stop')))) return;
      BC.running = false;
      try { const d = await api('/broadcast/' + BC.jobId + '/stop', { method: 'POST' }); bcPaint(d.job); } catch (e) {}
      loadHistory();
    },

    supRefresh: () => loadTickets(),
    supOpen: (d) => openTicket(d.id),
    supReply: (d) => supReply(d.id),
    supClose: (d) => supClose(d.id),

    creatorSupport: () => openCreatorChat(),
    creatorSend: () => creatorSend(),
    creatorUpdateGo: () => {
      creatorDismissUpdateIfChecked();
      const url = (CR.state && CR.state.repo) || '';
      closeModal();
      if (url) window.open(url, '_blank', 'noopener');
    },
    creatorUpdateLater: () => {
      creatorDismissUpdateIfChecked();
      if (MODAL.ctx.updateId) ssSet('cr_update_later_' + MODAL.ctx.updateId, '1');
      closeModal();
    },
    creatorNoticeOk: () => {
      closeModal();
      api('/creator/dismiss', { method: 'POST', body: { kind: 'notice' } }).catch(() => {});
    },

    menuSave: async () => {
      syncMenuSafe();
      try {
        const before = JSON.stringify((MU.menu.inlineButtons || []).map((r) => (r || []).map((b) => b && b.value)));
        const d = await api('/menu', { method: 'PUT', body: MU.menu });
        // The server stores what the bot will actually render (over-long callback
        // values are trimmed there), so re-sync the editor with the saved menu.
        if (d && d.menu) {
          const keepSub = MU.sub && d.menu.submenus && d.menu.submenus[MU.sub] ? MU.sub : null;
          MU.menu = d.menu;
          MU.sub = keepSub;
          renderMenuEditor();
        }
        const after = JSON.stringify(((d && d.menu && d.menu.inlineButtons) || []).map((r) => (r || []).map((b) => b && b.value)));
        if (before !== after && !MU.sub) toast(t('cbTrimmed'), 'warn');
        else toast(t('saved'), 'success');
      } catch (e) { toast(e.message, 'error'); }
    },
    menuReset: async () => {
      if (!(await confirmDlg(t('confirmReset'), t('resetDefaults')))) return;
      MU.menu = JSON.parse(JSON.stringify(MU.defaults));
      MU.sub = null;
      try { await api('/menu', { method: 'PUT', body: MU.menu }); toast(t('saved'), 'success'); } catch (e) {}
      renderMenuEditor();
    },
    ibDelBtn: (d) => {
      syncMenuSafe();
      const rows = ctxButtons(); const row = rows[+d.r];
      if (row) { row.splice(+d.b, 1); if (!row.length) rows.splice(+d.r, 1); }
      renderMenuEditor();
    },
    btnAddOpen: () => openBtnModal(),
    btnModalAdd: () => {
      const type = $('bm-type').value;
      const text = $('bm-text').value.trim();
      const valueEl = $('bm-value');
      const value = valueEl ? String(valueEl.value).trim() : '';
      if (!text) return toast(t('invalidForm'), 'error');
      if (type === 'url' && !/^https?:\/\//.test(value)) return toast(t('invalidForm'), 'error');
      // 64 bytes, not 64 characters: a Persian callback value would otherwise be
      // accepted here and rejected by Telegram, taking the whole menu down.
      if (type === 'callback' && !(byteLen(value) >= 1 && byteLen(value) <= 64)) return toast(byteLen(value) > 64 ? t('cbTooLong') : t('invalidForm'), 'error');
      if (type === 'submenu' && !value) return toast(t('invalidForm'), 'error');
      if (type === 'text' && !(value.length >= 1 && value.length <= 200)) return toast(t('invalidForm'), 'error');
      syncMenuSafe();
      const rows = ctxButtons();
      if (rows.length >= 10) return toast(t('invalidForm'), 'error');
      let ri;
      if ($('bm-row').value === 'new') { rows.push([]); ri = rows.length - 1; }
      else ri = Math.min(Math.max(+$('bm-row').value, 0), rows.length - 1);
      if (rows[ri].length >= 8) return toast(t('invalidForm'), 'error');
      let col = parseInt($('bm-col').value, 10);
      if (!Number.isInteger(col) || col < 1) col = rows[ri].length + 1;
      col = Math.min(col, rows[ri].length + 1);
      rows[ri].splice(col - 1, 0, { text, type, value });
      closeModal();
      renderMenuEditor();
    },
    btnMove: (d) => {
      syncMenuSafe();
      const rows = ctxButtons();
      const r = +d.r, b = +d.b;
      const row = rows[r];
      if (!row || !row[b]) return;
      if (d.dir === 'l' && b > 0) { const x = row[b - 1]; row[b - 1] = row[b]; row[b] = x; }
      else if (d.dir === 'r' && b < row.length - 1) { const x = row[b + 1]; row[b + 1] = row[b]; row[b] = x; }
      else if (d.dir === 'u' && r > 0) { const [x] = row.splice(b, 1); rows[r - 1].push(x); if (!row.length) rows.splice(r, 1); }
      else if (d.dir === 'd' && r < rows.length - 1) { const [x] = row.splice(b, 1); rows[r + 1].push(x); if (!row.length) rows.splice(r, 1); }
      renderMenuEditor();
    },

    subNew: () => {
      syncMenuSafe();
      const ids = Object.keys(MU.menu.submenus || {});
      let n = ids.length + 1, id = 'sm' + n;
      while (ids.includes(id)) { n++; id = 'sm' + n; }
      MU.menu.submenus = MU.menu.submenus || {};
      MU.menu.submenus[id] = { title: '', text: '', buttons: [[{ text: '', type: 'text', value: '' }]] };
      MU.sub = id;
      accSet('menu', 'subs', true);
      renderMenuEditor();
    },
    subEditBtn: (d) => { syncMenuSafe(); MU.sub = d.id; accSet('menu', 'subs', true); renderMenuEditor(); },
    subBack: () => { syncMenuSafe(); MU.sub = null; accSet('menu', 'subs', true); renderMenuEditor(); },
    subDel: async (d) => {
      if (!(await confirmDlg(t('subDelConfirm'), t('remove')))) return;
      syncMenuSafe();
      delete MU.menu.submenus[d.id];
      const strip = (rows) => rows.map((r) => r.filter((b) => !(b.type === 'submenu' && b.value === d.id))).filter((r) => r.length);
      MU.menu.inlineButtons = strip(MU.menu.inlineButtons);
      for (const sm of Object.values(MU.menu.submenus)) sm.buttons = strip(sm.buttons || []);
      MU.sub = null;
      renderMenuEditor();
    },

    saveGeneral: async () => {
      const body = {
        defaultLang: $('st-lang').value,
        botLangMode: $('st-langmode').value,
        adminId: $('st-admin-id') ? $('st-admin-id').value.trim() : '',
        supportButton: { enabled: $('st-sb-on').checked, fa: $('st-sb-fa').value.trim(), en: $('st-sb-en').value.trim() },
      };
      const tk = $('st-token-in').value.trim();
      if (tk) body.botToken = tk;
      const touchedIdentity = !!(tk || (body.adminId && $('st-admin-id').dataset.orig !== body.adminId));
      await api('/settings', { method: 'PUT', body });
      $('st-token-in').value = '';
      toast(t('saved'), 'success');
      await loadSettings();
      // A saved token alone never activates the bot: without a webhook Telegram
      // has nowhere to deliver updates, so warn loudly and only once per save.
      if (touchedIdentity) {
        try {
          const dash = await api('/dashboard/stats');
          if (!(dash && dash.webhook && dash.webhook.configured)) webhookWarningModal();
        } catch (e) { webhookWarningModal(); }
      }
    },
    saveChannel: async () => {
      await api('/settings', {
        method: 'PUT',
        body: {
          requiredChannel: {
            enabled: $('st-ch-on').checked,
            chatId: $('st-ch-id').value.trim(),
            url: $('st-ch-url').value.trim(),
          },
        },
      });
      toast(t('saved'), 'success');
    },
    saveTuning: async () => {
      await api('/settings', {
        method: 'PUT',
        body: { broadcast: { batchSize: Number($('st-batch').value), delayMs: Number($('st-delay').value) } },
      });
      toast(t('saved'), 'success');
    },
    changePw: async () => {
      const cur = $('st-cur-pw').value;
      const nw = $('st-new-pw').value;
      const nw2 = $('st-new-pw2').value;
      if (nw.length < 10) return toast(t('pwMinLen'), 'error');
      if (nw !== nw2) return toast(t('pwNoMatch'), 'error');
      const btn = document.querySelector('[data-act="changePw"]');
      btn.disabled = true;
      try {
        await api('/auth/change-password', { method: 'POST', body: { currentPassword: cur, newPassword: nw } });
        toast(t('pwChanged'), 'success');
        $('st-cur-pw').value = ''; $('st-new-pw').value = ''; $('st-new-pw2').value = '';
      } catch (e) {
        toast(e.message === 'wrong_password' ? t('wrongPw') : e.message === 'invalid_password' ? t('pwMinLen') : e.message, 'error');
      }
      btn.disabled = false;
    },
    gotoWebhook: () => { closeModal(); gotoWebhookSection(); },
    setWebhook: async (d) => {
      if (d.action === 'delete' && !(await confirmDlg(t('confirmDelWh'), t('delWebhook')))) return;
      try {
        await api('/settings/webhook', { method: 'POST', body: { action: d.action } });
        toast(d.action === 'set' ? t('webhookSetOk') : t('webhookDelOk'), 'success');
        loadSettings();
      } catch (e) { toast(e.message, 'error'); }
    },
  };

  function syncMenuSafe() { try { syncMenuDom(); } catch (e) {} }

  // ===== Bottom save-bar: one button that persists every saveable section of the
  // current route. Every save result is reported inside the bar itself, next to the
  // button: green for "saved" / "all changes saved", red when a save failed.
  const SAVE_ACT_RE = /^(save[A-Z]|vSave|sv[A-Za-z]*Save)/;
  const SAVE_ALL_EXCLUDE = ['vSavePurpose']; // structural action guarded by a confirm dialog
  const SAVE_MSG_CLS = {
    idle: 'text-slate-500 dark:text-slate-400',
    dirty: 'text-amber-600 dark:text-amber-400',
    saving: 'text-brand-600 dark:text-brand-400',
    saved: 'text-emerald-600 dark:text-emerald-400',
    savedAll: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-rose-600 dark:text-rose-400',
  };
  const SAVE_MSG_ICON = { dirty: 'circle-dot', saving: 'loader-2', saved: 'check-circle-2', savedAll: 'check-circle-2', error: 'alert-circle' };
  function saveAllActions() {
    const view = $('view');
    if (!view || !S.token || S.mustChangePassword) return [];
    const acts = [];
    view.querySelectorAll('[data-act]').forEach((el) => {
      const a = el.getAttribute('data-act') || '';
      // A button disabled by the in-flight busy lock still counts: the route's
      // save actions must be discoverable while one of them is saving.
      if (SAVE_ALL_EXCLUDE.includes(a) || acts.includes(a) || (el.disabled && !el.dataset.busy)) return;
      if (SAVE_ACT_RE.test(a) && typeof ACTIONS[a] === 'function') acts.push(a);
    });
    return acts;
  }
  // Renders the bar for the current state; called after every state change.
  function paintSaveBar() {
    const bar = $('save-bar');
    const m = $('save-bar-msg');
    if (!bar || !m) return;
    const state = S.saveBar;
    const text = state === 'saved' ? t('saved')
      : state === 'savedAll' ? t('allSaved')
      : state === 'dirty' ? t('unsavedHint')
      : state === 'saving' ? t('savingAll')
      : state === 'error' ? (S.saveBarError || t('saveFailed'))
      : '';
    m.className = 'flex-1 min-w-0 text-xs font-semibold leading-5 ' + (SAVE_MSG_CLS[state] || SAVE_MSG_CLS.idle);
    const icon = SAVE_MSG_ICON[state];
    m.innerHTML = text
      ? (icon ? '<i data-lucide="' + icon + '" class="' + (state === 'saving' ? 'animate-spin' : '') + '"></i>' : '') +
        '<span class="min-w-0">' + esc(text) + '</span>'
      : '';
    bar.classList.toggle('bp-ok', state === 'saved' || state === 'savedAll');
    bar.classList.toggle('bp-err', state === 'error');
    if (icon) refreshIcons();
  }
  let saveBarTimer = null;
  function saveBarClearTimer() { clearTimeout(saveBarTimer); saveBarTimer = null; }
  function saveBarAutoIdle(ms) {
    saveBarClearTimer();
    saveBarTimer = setTimeout(() => {
      if (S.saveBar === 'saved' || S.saveBar === 'savedAll') { S.saveBar = 'idle'; paintSaveBar(); }
    }, ms);
  }
  function updateSaveBar() {
    const bar = $('save-bar');
    if (!bar) return;
    const acts = saveAllActions();
    bar.classList.toggle('hidden', acts.length === 0);
    document.body.classList.toggle('bp-savebar-open', acts.length > 0);
    const lbl = $('save-bar-btn-label');
    if (lbl) lbl.textContent = t('saveAllBtn');
    if (!acts.length) { S.saveBar = 'idle'; S.saveBarError = ''; }
    paintSaveBar();
  }
  function saveBarDirty() {
    if (!saveAllActions().length) return;
    saveBarClearTimer();
    S.saveBar = 'dirty';
    S.saveBarError = '';
    paintSaveBar();
  }
  // A single section saved successfully: green "saved" inside the bar.
  function saveBarSectionSaved() {
    if (!saveAllActions().length || S.savingAll) return;
    S.saveBar = 'saved';
    S.saveBarError = '';
    paintSaveBar();
    saveBarAutoIdle(5000);
  }
  // "Save all changes" finished: green "all changes saved".
  function saveBarSaved() {
    if (!saveAllActions().length) return;
    S.saveBar = 'savedAll';
    S.saveBarError = '';
    paintSaveBar();
    saveBarAutoIdle(6000);
  }
  // A save failed: the bar says so in red and keeps saying it until the next edit.
  function saveBarError(message) {
    if (!saveAllActions().length) return;
    saveBarClearTimer();
    S.saveBar = 'error';
    S.saveBarError = message ? String(message) : '';
    paintSaveBar();
  }
  // Kept for callers that only want to drop the previous result.
  function saveBarReset() {
    if (!saveAllActions().length) return;
    saveBarClearTimer();
    S.saveBar = 'idle';
    S.saveBarError = '';
    paintSaveBar();
  }
  ACTIONS.saveAll = async () => {
    const acts = saveAllActions();
    if (!acts.length) return;
    const btn = $('save-bar-btn');
    if (btn) btn.disabled = true;
    saveBarClearTimer();
    S.saveBar = 'saving';
    S.saveBarError = '';
    paintSaveBar();
    S.savingAll = true;
    try {
      for (const a of acts) await ACTIONS[a]({}, null);
      saveBarSaved();
    } catch (e) {
      const msg = typeof vError === 'function' ? vError(e.message) : e.message;
      saveBarError(msg);
      toast(msg, 'error');
    } finally {
      S.savingAll = false;
      if (btn && btn.isConnected) btn.disabled = false;
    }
  };
  // Any edit inside the route view marks the bar as dirty (dropdown picks included:
  // ddPick dispatches input/change on the hidden input of the box).
  const saveBarEdit = (e) => {
    const x = e.target;
    if (x instanceof Element && x.closest('#view') && x.matches('input, textarea, select')) saveBarDirty();
  };
  document.addEventListener('input', saveBarEdit, true);
  document.addEventListener('change', saveBarEdit, true);

  const _origBcPause = ACTIONS.bcPause;
  ACTIONS.bcPause = async (...a) => {
    await _origBcPause(...a);
    const b = $('rp-pause');
    if (b) {
      b.setAttribute('data-act', 'bcResume');
      b.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>' + t('resume');
      refreshIcons();
    }
  };
  ACTIONS.bcResume = async () => {
    const b = $('rp-pause');
    if (b) {
      b.setAttribute('data-act', 'bcPause');
      b.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i>' + t('pause');
      refreshIcons();
    }
    if (!BC.jobId) return;
    try {
      const d = await api('/broadcast/' + BC.jobId + '/resume', { method: 'POST' });
      bcPaint(d.job);
      BC.running = true;
      bcLoop(BC.jobId);
    } catch (e) { toast(e.message, 'error'); }
  };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.bp-dd') && !e.target.closest('#dd-panel')) ddClose();
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.getAttribute('data-act');
    const fn = ACTIONS[act];
    if (fn && !el.disabled && !el.dataset.busy) {
      e.preventDefault();
      // The bar switches to "saving…" before the action runs so the action's own
      // success toast can be suppressed in favour of the in-bar message.
      const isSave = act !== 'saveAll' && SAVE_ACT_RE.test(act);
      let ret;
      if (isSave && !S.savingAll) { saveBarClearTimer(); S.saveBar = 'saving'; S.saveBarError = ''; paintSaveBar(); }
      try { ret = fn(el.dataset, el); } catch (err) {
        const msg = typeof vError === 'function' ? vError(err.message) : err.message;
        if (isSave) saveBarError(msg);
        toast(msg, 'error');
        return;
      }
      if (ret && typeof ret.then === 'function') {
        // Async action: hold a busy lock on the button so a double-tap cannot
        // run it twice; the lock releases only after the promise settles.
        el.dataset.busy = '1';
        el.disabled = true;
        Promise.resolve(ret)
          .then(() => { if (isSave) saveBarSectionSaved(); })
          .catch(err => {
            const msg = typeof vError === 'function' ? vError(err.message) : err.message;
            if (isSave) saveBarError(msg);
            toast(msg, 'error');
          })
          .finally(() => { delete el.dataset.busy; if (el.isConnected) el.disabled = false; });
      } else if (act !== 'saveAll' && SAVE_ACT_RE.test(act)) {
        saveBarSectionSaved();
      }
    }
  });

  // A pick is committed on pointerup, never on pointerdown: pointerdown must not
  // preventDefault, so the option list keeps its native touch scrolling. A drag
  // that moves past DD_PRESS_PX is a scroll gesture, not a selection.
  const DD_PRESS_PX = 12;
  function ddPressStart(id, x, y, target) {
    const opt = target instanceof Element ? target.closest('#dd-panel [data-act="ddPick"]') : null;
    DD.press = opt && DD.openBox ? { id: id, x: x, y: y, opt: opt } : null;
  }
  function ddPressMove(id, x, y) {
    if (!DD.press || DD.press.id !== id) return;
    if (Math.hypot(x - DD.press.x, y - DD.press.y) > DD_PRESS_PX) DD.press = null;
  }
  function ddPressEnd(id, x, y, target) {
    const press = DD.press;
    DD.press = null;
    if (!press || !DD.openBox || press.id !== id) return;
    const opt = target instanceof Element ? target.closest('#dd-panel [data-act="ddPick"]') : null;
    if (!opt || opt !== press.opt) return;
    if (Math.hypot(x - press.x, y - press.y) > DD_PRESS_PX) return;
    // The option disappears with the panel, so the browser retargets the trailing click
    // to whatever now sits under the finger (often the modal backdrop). Swallow it once.
    DD.swallowClickUntil = Date.now() + 700;
    ACTIONS.ddPick(opt.dataset, opt);
  }
  function ddPressCancel() { DD.press = null; }
  document.addEventListener('pointerdown', (e) => ddPressStart(e.pointerId, e.clientX, e.clientY, e.target), { passive: true });
  document.addEventListener('pointermove', (e) => ddPressMove(e.pointerId, e.clientX, e.clientY), { passive: true });
  document.addEventListener('pointerup', (e) => ddPressEnd(e.pointerId, e.clientX, e.clientY, e.target));
  document.addEventListener('pointercancel', ddPressCancel);
  if (!('PointerEvent' in window)) {
    const touchPt = (e) => e.changedTouches && e.changedTouches[0];
    document.addEventListener('touchstart', (e) => { const p = touchPt(e); if (p) ddPressStart(p.identifier, p.clientX, p.clientY, e.target); }, { passive: true });
    document.addEventListener('touchmove', (e) => { const p = touchPt(e); if (p) ddPressMove(p.identifier, p.clientX, p.clientY); }, { passive: true });
    document.addEventListener('touchend', (e) => { const p = touchPt(e); if (p) ddPressEnd(p.identifier, p.clientX, p.clientY, e.target); });
    document.addEventListener('touchcancel', ddPressCancel);
  }

  document.addEventListener('click', (e) => {
    if (!DD.swallowClickUntil) return;
    const stale = Date.now() > DD.swallowClickUntil;
    DD.swallowClickUntil = 0;
    if (stale) return;
    if (e.target instanceof Element && (e.target.closest('#dd-panel') || e.target.closest('.bp-dd'))) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  document.addEventListener('input', (e) => {
    const x = e.target;
    if (x.id === 'bc-text' && $('bc-count')) {
      $('bc-count').textContent = fmtNum(x.value.length) + ' / 4096';
      return;
    }
    if (x.classList.contains('poll-opt')) { BC.pollOpts[+x.dataset.i] = x.value; return; }
    if (x.classList.contains('bc-bt') || x.classList.contains('bc-bu')) {
      const rowEl = x.closest('[data-r]'), bEl = x.closest('[data-b]');
      if (!rowEl || !bEl) return;
      const b = BC.rows[+rowEl.dataset.r] && BC.rows[+rowEl.dataset.r][+bEl.dataset.b];
      if (b) { if (x.classList.contains('bc-bt')) b.text = x.value; else b.url = x.value; }
      return;
    }
    if (x.id === 'bc-users') { BC.userIds = x.value; return; }
    if (x.id === 'bc-chat') { BC.chatId = x.value; return; }
    if (x.classList.contains('ib-t') || x.classList.contains('ib-v')) { syncMenuSafe(); return; }
    if (x.classList.contains('kb-row-in')) { syncMenuSafe(); }
  });

  document.addEventListener('change', (e) => {
    const x = e.target;
    if (x.id === 'users-limit') { UP.limit = Number(x.value); loadUsers(true); }
    if (x.id === 'bc-target') {
      BC.target = x.value;
      const u = $('tg-users'), c = $('tg-chat');
      if (u) u.classList.toggle('hidden', BC.target !== 'users');
      if (c) c.classList.toggle('hidden', BC.target !== 'chat');
    }
    if (x.id === 'st-langmode') {
      const dw = $('deflang-wrap');
      if (dw) dw.classList.toggle('hidden', x.value !== 'both');
      return;
    }
    if (x.id === 'bm-type') {
      const vb = $('bm-value-box');
      if (vb) vb.innerHTML = modalValueEl(x.value);
      return;
    }
    if (x.classList && x.classList.contains('ib-type')) {
      syncMenuSafe();
      const bEl = x.closest('[data-b]');
      const rowEl = x.closest('[data-r]');
      if (bEl && rowEl && MU.menu) {
        const rows = ctxButtons();
        const b = rows[+rowEl.dataset.r] && rows[+rowEl.dataset.r][+bEl.dataset.b];
        if (b) { b.type = x.value; if (b.type !== 'submenu' && b.type !== 'text') b.value = b.value || ''; }
        renderMenuEditor();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { ddClose(); return; }
    if (e.key !== 'Enter') return;
    if (e.target.id === 'setup-new' || e.target.id === 'setup-repeat') { e.preventDefault(); ACTIONS.finishPasswordSetup(); return; }
    if (e.target.id === 'pw') { e.preventDefault(); doLogin(); }
    else if (e.target.id === 'user-q') { e.preventDefault(); loadUsers(true); }
  });
  document.addEventListener('scroll', (e) => {
    if (!DD.openBox) return;
    if (e.target instanceof Element && e.target.closest('#dd-panel')) return;
    if (!DD.positionFrame) DD.positionFrame = requestAnimationFrame(() => { DD.positionFrame = null; if (DD.openBox) positionDropdown(); });
  }, true);
  window.addEventListener('resize', () => { if (DD.openBox) positionDropdown(); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => { if (DD.openBox) positionDropdown(); });
    window.visualViewport.addEventListener('scroll', () => { if (DD.openBox) positionDropdown(); });
  }

  function go(route) {
    if (ROUTES.includes(route)) location.hash = '#/' + route;
  }
  function render() {
    clearTimers();
    ddClose();
    const h = (location.hash || '').replace(/^#\/?/, '');
    const route = ROUTES.includes(h) ? h : 'dashboard';
    const routeChanged = route !== S.route;
    S.route = typeof visibleRoute === 'function' && !visibleRoute(route) ? 'dashboard' : route;
    if (!S.token) { renderLogin(); updateSaveBar(); return; }
    if (S.mustChangePassword) { renderPasswordSetup(); updateSaveBar(); return; }
    renderShell();
    if (routeChanged) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.addEventListener('hashchange', render);

function renderPasswordSetup() {
  const en=S.lang==='en';
  $('app').innerHTML='<main class="min-h-screen flex items-center justify-center p-5"><section class="'+CLS.card+' w-full max-w-md p-7 animate-fadeIn"><div class="v-icon mb-4"><i data-lucide="shield-check"></i></div><h1 class="font-extrabold text-xl mb-3">'+(en?'Set your private password':'رمز خصوصی پنل را تعیین کنید')+'</h1><p class="text-sm text-slate-400 leading-7 mb-5">'+(en?'Initial login succeeded. For security, choose a private password before accessing bot tokens or financial data. No Cloudflare variable is needed.':'ورود با رمز اولیه انجام شد. برای محافظت از توکن‌ها و اطلاعات مالی، پیش از ورود به بخش‌های پنل یک رمز خصوصی تعیین کنید؛ نیازی به متغیر Cloudflare نیست.')+'</p><label class="'+CLS.label+'" for="setup-new">'+(en?'New password (at least 10 characters)':'رمز جدید (حداقل ۱۰ کاراکتر)')+'</label><input id="setup-new" type="password" autocomplete="new-password" minlength="10" class="'+CLS.input+'"><label class="'+CLS.label+' mt-4" for="setup-repeat">'+(en?'Repeat new password':'تکرار رمز جدید')+'</label><input id="setup-repeat" type="password" autocomplete="new-password" class="'+CLS.input+'"><p id="setup-error" role="alert" class="text-sm text-rose-400 mt-3"></p><button type="button" id="setup-submit" data-act="finishPasswordSetup" class="'+CLS.btnP+' w-full mt-5">'+(en?'Save password & open panel':'ذخیره رمز و ورود به پنل')+'</button><button data-act="setupLogout" class="'+CLS.btnS+' w-full mt-3">'+(en?'Sign out':'خروج')+'</button><p class="text-xs text-slate-400 leading-6 mt-5">'+(en?'Your previous custom password, if configured, is preserved. The public initial password cannot be retained.':'اگر قبلاً رمز اختصاصی ثبت کرده‌اید، همان حفظ می‌شود. نگه‌داشتن رمز عمومی اولیه مجاز نیست.')+'</p></section></main>';
  refreshIcons();$('setup-new').focus();
}
ACTIONS.finishPasswordSetup = async () => {
  const password=$('setup-new')?.value||'', repeat=$('setup-repeat')?.value||'';
  const fail=message=>{if($('setup-error'))$('setup-error').textContent=message;};
  if(password.length<10)return fail(S.lang==='en'?'Use at least 10 characters.':'رمز باید حداقل ۱۰ کاراکتر باشد.');
  if(password!==repeat)return fail(S.lang==='en'?'Passwords do not match.':'تکرار رمز مطابقت ندارد.');
  if(password==='botpanel123')return fail(S.lang==='en'?'Choose a different, private password.':'یک رمز خصوصی متفاوت انتخاب کنید.');
  const button=$('setup-submit');if(!button||button.disabled)return;button.disabled=true;
  try { await api('/auth/change-password',{method:'POST',body:{currentPassword:'botpanel123',newPassword:password}});S.mustChangePassword=false;await initV2();render(); }
  catch(e){fail(typeof vError==='function'?vError(e.message):e.message);}
  finally {if(button.isConnected)button.disabled=false;}
};
ACTIONS.setupLogout=async()=>{await api('/auth/logout',{method:'POST'}).catch(()=>{});S.token='';S.mustChangePassword=false;sessionStorage.removeItem('bp_token');render();};
