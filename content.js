/**
 * @file content.js
 * @description Core content script for the GoPhishFree Chrome extension, injected into
 *   Gmail pages to perform real-time phishing detection and risk assessment. This script
 *   orchestrates the full email scanning lifecycle: detecting email opens via URL and DOM
 *   monitoring, extracting email features (links, sender info, text content, attachments,
 *   BEC patterns), building a 64-feature unified vector, running a calibrated Random Forest
 *   model for local ML inference, displaying risk badges and an analysis side panel, and
 *   optionally invoking cloud-based AI analysis and deep scan of linked pages.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2025-02-01
 * @dateRevised 2026-02-14 - Sprint 2: Added comprehensive comments and documentation (All programmers)
 *
 * @preconditions
 *   - The script must be injected into a Gmail page (mail.google.com).
 *   - The FeatureExtractor class must be loaded before this script executes.
 *   - The Chrome extension APIs (chrome.runtime, chrome.storage) must be available.
 *   - The ML model JSON (model/model_unified.json or model/model_trees.json) must be
 *     accessible via chrome.runtime.getURL().
 *   - Optional: DnsChecker and PageAnalyzer classes may be loaded for enhanced scanning.
 *
 * @acceptableInput
 *   - Gmail DOM elements containing email data (sender, links, body text, attachments).
 *   - ML model JSON with fields: trees, scaler_mean, scaler_scale, calibration.
 *   - User settings from chrome.storage.local (enhancedScanning, aiEnhanceEnabled,
 *     customTrustedDomains, customBlockedDomains).
 *
 * @unacceptableInput
 *   - Non-Gmail pages (script will fail to find expected DOM elements).
 *   - Malformed or missing ML model JSON (inference falls back to rules-based scoring).
 *   - Corrupted chrome.storage data (gracefully handled with defaults).
 *
 * @postconditions
 *   - A risk badge (low/medium/high/dangerous) is displayed on the email header.
 *   - An analysis side panel is available with detailed risk indicators.
 *   - Scan results are persisted to chrome.storage via background script messaging.
 *   - The fish collection is updated in extension storage.
 *
 * @returnValues This script does not export or return values; it operates via side effects
 *   (DOM manipulation, chrome.storage writes, chrome.runtime messaging).
 *
 * @errorConditions
 *   - FeatureExtractor not loaded: script exits immediately with console error.
 *   - ML model fetch failure: falls back to default probability (0.5).
 *   - DNS check failure: continues scan without DNS features.
 *   - Deep scan page fetch failure: logs error, restores previous badge.
 *   - AI analysis failure: displays "AI unavailable" in side panel.
 *
 * @sideEffects
 *   - Injects UI elements into the Gmail DOM (risk badges, side panel, overlays).
 *   - Sends messages to the background service worker (saveScanResult, runAiAnalysis,
 *     requestPermissions, fetchPageHTML).
 *   - Reads and writes to chrome.storage.local.
 *   - Registers MutationObserver on document.body and URL polling interval.
 *
 * @invariants
 *   - Risk scores are always integers in the range [0, 100].
 *   - Only one scan can be in progress at a time (guarded by scanInProgress flag).
 *   - The ML model, once loaded, is immutable for the lifetime of the page.
 *   - No raw email text or subject lines are sent to external AI services.
 *
 * @knownFaults
 *   - Gmail DOM selectors may break if Google changes the Gmail HTML structure.
 *   - The MutationObserver may fire redundantly, though duplicate scans are prevented.
 *   - Free email provider list and trusted domain list require manual maintenance.
 *   - Deep scan is limited to 10 unique URLs and 2MB of HTML per page.
 */

(function() {
  'use strict';
  
  // ================================================================
  //  Fish Type Definitions
  //  Maps risk score ranges to themed fish characters used for visual
  //  feedback in badges and the "fish caught" celebration animation.
  // ================================================================
  const FISH_TYPES = {
    friendly: {
      emoji: '\u{1F41F}',
      name: 'Friendly Fish',
      description: 'This email looks safe!',
      minRisk: 0,
      maxRisk: 49
    },
    suspicious: {
      emoji: '\u{1F420}',
      name: 'Suspicious Fish',
      description: 'Something seems a bit fishy...',
      minRisk: 50,
      maxRisk: 75
    },
    phishy: {
      emoji: '\u{1F421}',
      name: 'Phishy Puffer',
      description: 'Watch out! This looks like phishing!',
      minRisk: 76,
      maxRisk: 89
    },
    shark: {
      emoji: '\u{1F988}',
      name: 'Mega Phish Shark',
      description: 'DANGER! Highly suspicious phishing attempt!',
      minRisk: 90,
      maxRisk: 100
    }
  };
  
  // ================================================================
  //  Trusted Domain Whitelist
  //  500+ well-known legitimate domains used for post-model score
  //  dampening. Emails from these domains (that lack phishing signals)
  //  receive a capped risk score to reduce false positives. Combined
  //  at runtime with user-managed custom domains from chrome.storage.
  // ================================================================
  const TRUSTED_DOMAINS = new Set([
    // ── Big Tech & Platforms ──
    // NOTE: Free email providers (gmail.com, outlook.com, icloud.com, etc.)
    // are in FREE_EMAIL_PROVIDERS, NOT here. Anyone can register on those.
    'google.com','youtube.com','android.com','chromium.org','googleplex.com',
    'googleusercontent.com','gstatic.com','withgoogle.com','google.co.uk',
    'google.ca','google.com.au','google.de','google.fr','google.co.jp','google.co.in',
    'microsoft.com','office365.com','office.com',
    'bing.com','skype.com','visualstudio.com','azure.com',
    'onedrive.com','sharepoint.com','teams.microsoft.com',
    'apple.com',
    'amazon.com','amazon.co.uk','amazon.de','amazon.ca','amazon.fr','amazon.co.jp',
    'amazon.com.au','amazon.in','amazon.es','amazon.it','amazon.com.br','amazon.com.mx',
    'meta.com','facebook.com','instagram.com','whatsapp.com','messenger.com','fb.com',
    'oculus.com','threads.net',
    'twitter.com','x.com',
    'linkedin.com',
    'tiktok.com','bytedance.com',
    'snapchat.com','snap.com',
    'pinterest.com',
    'reddit.com',
    'spotify.com',
    'netflix.com',
    'hulu.com','huluim.com',
    'disneyplus.com','disney.com','disneyland.com',
    'hbomax.com','warnermedia.com','max.com','warnerbros.com',
    'peacocktv.com','nbcuniversal.com',
    'paramountplus.com','paramount.com',
    'crunchyroll.com','funimation.com',
    'zoom.us','zoom.com',
    'slack.com',
    'dropbox.com',
    'box.com',
    'adobe.com','creativecloud.com',
    'salesforce.com','force.com','pardot.com',
    'atlassian.com','atlassian.net','bitbucket.org','trello.com',
    'notion.so',
    'figma.com',
    'canva.com',
    'twitch.tv',
    'discord.com','discordapp.com',
    'github.com','github.io','githubusercontent.com',
    'gitlab.com',
    'stackoverflow.com','stackexchange.com','askubuntu.com','serverfault.com',
    'nvidia.com',
    'intel.com',
    'amd.com',
    'samsung.com','samsungknox.com',
    'sony.com','playstation.com',
    'oracle.com',
    'ibm.com',
    'cisco.com','webex.com',
    'vmware.com','broadcom.com',
    'hp.com','hpe.com',
    'dell.com','emc.com',
    'lenovo.com',
    'qualcomm.com',
    'arm.com',
    'toshiba.com',
    'panasonic.com',
    'lg.com',
    'motorola.com',
    'huawei.com',
    'xiaomi.com',

    // ── Cloud / SaaS / DevTools ──
    'amazonaws.com','aws.amazon.com',
    'googlecloud.com','cloud.google.com',
    'azure.microsoft.com',
    'heroku.com',
    'digitalocean.com',
    'cloudflare.com',
    'vercel.com',
    'netlify.com','netlify.app',
    'render.com',
    'railway.app',
    'fly.io',
    'supabase.com','supabase.io',
    'firebase.google.com','firebaseapp.com',
    'mongodb.com',
    'planetscale.com',
    'airtable.com',
    'shopify.com','myshopify.com',
    'squarespace.com',
    'wix.com',
    'webflow.com',
    'godaddy.com',
    'namecheap.com',
    'hover.com',
    'cloudflare.com',
    'wordpress.com','wordpress.org','wp.com',
    'medium.com',
    'substack.com',
    'ghost.org','ghost.io',
    'mailchimp.com','mandrillapp.com',
    'sendgrid.net','sendgrid.com',
    'constantcontact.com',
    'mailgun.com',
    'postmarkapp.com',
    'sendinblue.com','brevo.com',
    'convertkit.com',
    'activecampaign.com',
    'drip.com',
    'hubspot.com','hubspotmail.com',
    'zendesk.com',
    'intercom.com','intercom.io',
    'freshdesk.com','freshworks.com',
    'asana.com',
    'monday.com',
    'basecamp.com',
    'clickup.com',
    'linear.app',
    'jira.com',
    'confluence.com',
    'docusign.com','docusign.net',
    'hellosign.com',
    'pandadoc.com',
    'twilio.com',
    'stripe.com',
    'braintreepayments.com',
    'square.com','squareup.com','block.xyz',
    'intuit.com','quickbooks.com','turbotax.com','mint.com',
    'freshbooks.com',
    'xero.com',
    'grammarly.com',
    'evernote.com',
    'todoist.com',
    '1password.com',
    'lastpass.com',
    'bitwarden.com',
    'dashlane.com',
    'nordpass.com',
    'nordvpn.com','nordlayer.com',
    'expressvpn.com',
    'surfshark.com',
    'protonvpn.com',
    'okta.com',
    'auth0.com',
    'onelogin.com',
    'duo.com',
    'datadog.com','datadoghq.com',
    'splunk.com',
    'elastic.co',
    'pagerduty.com',
    'newrelic.com',
    'sentry.io',
    'grafana.com',
    'launchdarkly.com',
    'circleci.com',
    'travis-ci.com',
    'jenkins.io',
    'hashicorp.com',
    'terraform.io',
    'docker.com',
    'kubernetes.io',
    'npmjs.com','npmjs.org',
    'pypi.org',
    'rubygems.org',
    'crates.io',
    'nuget.org',

    // ── Finance / Banking / Fintech ──
    'paypal.com','paypal.me',
    'venmo.com',
    'cashapp.com','cash.app',
    'zelle.com',
    'chase.com','jpmorgan.com','jpmorganchase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citi.com','citibank.com','citigroup.com',
    'capitalone.com',
    'americanexpress.com','amex.com',
    'discover.com',
    'usbank.com',
    'pnc.com',
    'tdbank.com','td.com',
    'regions.com',
    'suntrust.com','truist.com',
    'ally.com',
    'marcus.com',
    'synchrony.com',
    'navyfederal.org',
    'usaa.com',
    'schwab.com',
    'fidelity.com',
    'vanguard.com',
    'troweprice.com',
    'edwardjones.com',
    'morganstanley.com',
    'goldmansachs.com',
    'etrade.com',
    'tdameritrade.com',
    'interactivebrokers.com',
    'wealthfront.com',
    'betterment.com',
    'robinhood.com',
    'webull.com',
    'coinbase.com',
    'kraken.com',
    'binance.com',
    'gemini.com',
    'crypto.com',
    'wise.com','transferwise.com',
    'revolut.com',
    'sofi.com',
    'chime.com',
    'plaid.com',
    'affirm.com',
    'klarna.com',
    'afterpay.com',
    'clearpay.com',
    'creditkarma.com',
    'experian.com',
    'equifax.com',
    'transunion.com',
    'annualcreditreport.com',

    // ── Social Media / Communication ──
    'signal.org',
    'telegram.org',
    'viber.com',
    'line.me',
    'wechat.com',
    'kakaocorp.com',
    'tumblr.com',
    'quora.com',
    'yelp.com',
    'nextdoor.com',
    'clubhouse.com',
    'mastodon.social',
    'bsky.social','bsky.app',
    'meetup.com',
    'eventbrite.com',
    'goodreads.com',
    'imdb.com',
    'letterboxd.com',
    'strava.com',
    'flickr.com',
    'deviantart.com',
    'behance.net',
    'dribbble.com',
    'producthunt.com',
    'angellist.com',

    // ── News / Media / Publishing ──
    'washingtonpost.com',
    'nytimes.com',
    'wsj.com',
    'bbc.com','bbc.co.uk',
    'cnn.com',
    'reuters.com',
    'apnews.com',
    'usatoday.com',
    'nbcnews.com','nbc.com','nbcuni.com',
    'abcnews.go.com','abc.com',
    'cbsnews.com','cbs.com',
    'foxnews.com','fox.com',
    'npr.org','pbs.org',
    'theguardian.com',
    'independent.co.uk',
    'telegraph.co.uk',
    'dailymail.co.uk',
    'mirror.co.uk',
    'sky.com',
    'bloomberg.com','bloombergmail.com',
    'cnbc.com',
    'marketwatch.com',
    'barrons.com',
    'forbes.com',
    'fortune.com',
    'businessinsider.com','insider.com',
    'techcrunch.com',
    'wired.com',
    'arstechnica.com',
    'theverge.com','vox.com','voxmedia.com',
    'engadget.com',
    'mashable.com',
    'cnet.com',
    'zdnet.com',
    'tomshardware.com',
    'pcmag.com',
    'vice.com','motherboard.vice.com',
    'huffpost.com',
    'buzzfeed.com','buzzfeednews.com',
    'politico.com',
    'thehill.com',
    'axios.com',
    'economist.com',
    'ft.com',
    'time.com',
    'newsweek.com',
    'theatlantic.com',
    'newyorker.com',
    'vanityfair.com',
    'rollingstone.com',
    'wired.co.uk',
    'nationalgeographic.com',
    'scientificamerican.com',
    'nature.com',
    'science.org',
    'latimes.com',
    'chicagotribune.com',
    'sfchronicle.com','sfgate.com',
    'bostonglobe.com',
    'seattletimes.com',
    'miamiherald.com',
    'denverpost.com',
    'dallasnews.com',
    'startribune.com',
    'oregonlive.com',
    'philly.com',
    'detroitnews.com',

    // ── E-commerce / Retail ──
    'ebay.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'costco.com',
    'samsclub.com',
    'homedepot.com',
    'lowes.com',
    'menards.com',
    'etsy.com',
    'wayfair.com',
    'overstock.com',
    'ikea.com',
    'crateandbarrel.com',
    'potterybarn.com',
    'westelm.com',
    'zappos.com',
    'nordstrom.com',
    'macys.com',
    'bloomingdales.com',
    'kohls.com',
    'jcpenney.com',
    'tjmaxx.com',
    'marshalls.com',
    'ross-simons.com',
    'sephora.com',
    'ulta.com',
    'bathandbodyworks.com',
    'nike.com',
    'adidas.com',
    'underarmour.com',
    'newbalance.com',
    'puma.com',
    'reebok.com',
    'lululemon.com',
    'gap.com','oldnavy.com','bananarepublic.com',
    'hm.com',
    'zara.com','inditex.com',
    'uniqlo.com',
    'asos.com',
    'shein.com',
    'fashionnova.com',
    'chewy.com',
    'petco.com',
    'petsmart.com',
    'newegg.com',
    'bhphotovideo.com',
    'rei.com',
    'dickssportinggoods.com',
    'academy.com',
    'staples.com',
    'officedepot.com',
    'gamestop.com',
    'barnesandnoble.com',
    'alibaba.com','aliexpress.com',
    'wish.com',
    'temu.com',
    'groupon.com',
    'rakuten.com',
    'vitacost.com',
    'iherb.com',
    'thrive.com',

    // ── Travel / Transport / Hospitality ──
    'uber.com',
    'lyft.com',
    'airbnb.com',
    'vrbo.com',
    'booking.com',
    'hotels.com',
    'expedia.com',
    'orbitz.com',
    'priceline.com',
    'hotwire.com',
    'tripadvisor.com',
    'kayak.com',
    'skyscanner.com',
    'google.com', // Google Flights
    'southwest.com',
    'united.com',
    'delta.com',
    'aa.com','americanairlines.com',
    'jetblue.com',
    'alaskaair.com',
    'spirit.com',
    'frontier.com',
    'hawaiianairlines.com',
    'britishairways.com',
    'lufthansa.com',
    'airfrance.com',
    'klm.com',
    'emirates.com',
    'qatarairways.com',
    'singaporeair.com',
    'cathaypacific.com',
    'ana.co.jp',
    'hilton.com',
    'marriott.com','starwoodhotels.com','spg.com',
    'hyatt.com',
    'ihg.com',
    'wyndhamhotels.com',
    'choicehotels.com',
    'bestwestern.com',
    'accor.com',
    'radissonhotels.com',
    'hertz.com',
    'avis.com',
    'enterprise.com',
    'nationalcar.com',
    'budget.com',
    'carnival.com',
    'royalcaribbean.com',
    'ncl.com',

    // ── Food / Delivery / Restaurants ──
    'doordash.com',
    'grubhub.com',
    'ubereats.com',
    'postmates.com',
    'instacart.com',
    'seamless.com',
    'caviar.com',
    'gopuff.com',
    'shipt.com',
    'freshdirect.com',
    'blueapron.com',
    'hellofresh.com',
    'hungryroot.com',
    'starbucks.com',
    'mcdonalds.com',
    'chipotle.com',
    'dominos.com',
    'papajohns.com',
    'pizzahut.com',
    'subway.com',
    'chickfila.com',
    'wendys.com',
    'burgerking.com',
    'tacobell.com',
    'dunkindonuts.com','dunkin.com',
    'panera.com','panerabread.com',
    'olivegarden.com','darden.com',

    // ── Education / Research ──
    'coursera.org',
    'udemy.com',
    'edx.org',
    'khanacademy.org',
    'duolingo.com',
    'skillshare.com',
    'masterclass.com',
    'pluralsight.com',
    'codecademy.com',
    'freecodecamp.org',
    'udacity.com',
    'brilliant.org',
    'lynda.com',
    'linkedin.com', // LinkedIn Learning
    'mit.edu',
    'stanford.edu',
    'harvard.edu',
    'yale.edu',
    'princeton.edu',
    'columbia.edu',
    'cornell.edu',
    'berkeley.edu',
    'caltech.edu',
    'cmu.edu',
    'umich.edu',
    'ucla.edu',
    'nyu.edu',
    'uchicago.edu',
    'gatech.edu',
    'illinois.edu',
    'utexas.edu',
    'uw.edu',
    'purdue.edu',
    'psu.edu',
    'osu.edu',
    'ku.edu',
    'wisc.edu',
    'umn.edu',
    'ufl.edu',
    'unc.edu',
    'virginia.edu',
    'ox.ac.uk',
    'cam.ac.uk',
    'scholar.google.com',
    'researchgate.net',
    'academia.edu',
    'arxiv.org',
    'ieee.org',
    'acm.org',

    // ── Government / Institutions / Nonprofits ──
    'irs.gov','treasury.gov',
    'ssa.gov',
    'medicare.gov',
    'healthcare.gov',
    'usa.gov',
    'whitehouse.gov',
    'senate.gov',
    'house.gov',
    'congress.gov',
    'state.gov',
    'dhs.gov','uscis.gov',
    'fbi.gov',
    'cia.gov',
    'nasa.gov',
    'cdc.gov',
    'nih.gov',
    'fda.gov',
    'epa.gov',
    'fema.gov',
    'sec.gov',
    'ftc.gov',
    'fcc.gov',
    'dot.gov','nhtsa.gov',
    'ed.gov',
    'energy.gov',
    'defense.gov',
    'va.gov',
    'sba.gov',
    'usps.com',
    'ups.com',
    'fedex.com',
    'dhl.com','dhl.de',
    'who.int',
    'un.org',
    'worldbank.org',
    'imf.org',
    'redcross.org',
    'unicef.org',
    'amnesty.org',
    'greenpeace.org',
    'wikipedia.org','wikimedia.org',
    'archive.org',
    'mozilla.org','mozilla.com',
    'eff.org',
    'aclu.org',
    'change.org',
    'gofundme.com',
    'kickstarter.com',
    'indiegogo.com',
    'patreon.com',

    // ── Health / Fitness / Wellness ──
    'myfitnesspal.com',
    'fitbit.com',
    'garmin.com',
    'peloton.com',
    'headspace.com',
    'calm.com',
    'noom.com',
    'weightwatchers.com','ww.com',
    'webmd.com',
    'healthline.com',
    'mayoclinic.org',
    'clevelandclinic.org',
    'hopkinsmedicine.org',
    'mountsinai.org',
    'zocdoc.com',
    'teladoc.com',
    'onemedical.com',
    'cvs.com','cvshealth.com',
    'walgreens.com',
    'riteaid.com',
    'goodrx.com',
    'optum.com','unitedhealthgroup.com',
    'anthem.com','elevancehealth.com',
    'cigna.com',
    'aetna.com',
    'humana.com',
    'kaiser.com','kaiserpermanente.org',
    'bluecrossblueShield.com','bcbs.com',

    // ── Telecom / ISP / Utilities ──
    'att.com','att.net',
    'verizon.com',
    'tmobile.com','sprint.com',
    'comcast.com','xfinity.com',
    'spectrum.com','charter.com',
    'cox.com',
    'centurylink.com','lumen.com',
    'frontier.com',
    'optimum.com','altice.com',
    'dish.com','sling.com',
    'directv.com',
    'visible.com',
    'mintmobile.com',
    'cricketwireless.com',
    'boostmobile.com',
    'uscellular.com',
    'vodafone.com',
    'ee.co.uk',
    'three.co.uk',
    'o2.co.uk',
    'bt.com',
    'rogers.com',
    'bell.ca',
    'telus.com',
    'optus.com.au',
    'telstra.com.au',

    // ── Gaming / Entertainment ──
    'steampowered.com','steamgames.com','store.steampowered.com','valve.com',
    'epicgames.com',
    'ea.com','origin.com',
    'blizzard.com','battle.net','activision.com',
    'riotgames.com',
    'xbox.com',
    'playstation.com','sie.com',
    'nintendo.com','nintendo.co.jp',
    'ubisoft.com',
    'rockstargames.com',
    'bethesda.net',
    'squareenix.com',
    'bandainamcoent.com',
    'sega.com',
    'capcom.com',
    'konami.com',
    'gog.com',
    'humblebundle.com',
    'itch.io',
    'roblox.com',
    'minecraft.net',

    // ── Automotive / Insurance / Real Estate ──
    'tesla.com',
    'ford.com',
    'gm.com','chevrolet.com','buick.com','cadillac.com','gmc.com',
    'toyota.com','lexus.com',
    'honda.com','acura.com',
    'nissan.com','infiniti.com',
    'hyundai.com','genesis.com','kia.com',
    'bmw.com','bmwusa.com',
    'mercedes-benz.com','mbusa.com',
    'audi.com','audiusa.com',
    'volkswagen.com','vw.com',
    'porsche.com',
    'subaru.com',
    'mazda.com',
    'volvo.com','volvocars.com',
    'rivian.com',
    'lucidmotors.com',
    'carvana.com',
    'carmax.com',
    'autotrader.com',
    'cars.com',
    'truecar.com',
    'geico.com',
    'statefarm.com',
    'progressive.com',
    'allstate.com',
    'libertymutual.com',
    'nationwide.com',
    'farmers.com',
    'usaa.com',
    'lemonade.com',
    'zillow.com',
    'realtor.com',
    'redfin.com',
    'trulia.com',
    'apartments.com',
    'rent.com',
    'compass.com',
    'coldwellbanker.com',
    'remax.com',
    'kw.com',
    'century21.com',
    'sothebysrealty.com',
    'rocket.com','rocketmortgage.com','quickenloans.com',
    'loanDepot.com',
    'better.com'
  ]);

  // ================================================================
  //  Free / Public Email Providers
  //  Anyone can register on these services, so they must NOT receive
  //  trusted-domain score dampening. Phishing is commonly sent from
  //  free accounts on these providers. Checked via isFreeEmailProvider().
  // ================================================================
  const FREE_EMAIL_PROVIDERS = new Set([
    // Google
    'gmail.com', 'googlemail.com',
    // Microsoft
    'outlook.com', 'hotmail.com', 'live.com', 'windowslive.com', 'msn.com',
    // Apple
    'icloud.com', 'me.com', 'mac.com',
    // Yahoo / Verizon Media
    'yahoo.com', 'ymail.com', 'yahoo.co.uk', 'yahoo.co.jp', 'yahoo.ca',
    'yahoo.com.au', 'yahoo.fr', 'yahoo.de', 'yahoo.it', 'yahoo.es',
    'aol.com', 'aim.com',
    // Proton
    'protonmail.com', 'proton.me', 'pm.me',
    // Other free providers
    'tutanota.com', 'tuta.io',
    'fastmail.com',
    'zoho.com',
    'yandex.com', 'yandex.ru',
    'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru',
    'gmx.com', 'gmx.net', 'gmx.de',
    'web.de',
    'mail.com',
    'hushmail.com',
    'runbox.com',
    'mailbox.org',
    'disroot.org',
    'riseup.net',
    'cock.li',
    'eclipso.de',
    'posteo.de',
  ]);

  /**
   * Check if a domain is a free/public email provider (anyone can register).
   * Emails from these providers should NOT get trusted-domain dampening.
   */
  function isFreeEmailProvider(domain) {
    if (!domain) return false;
    const d = domain.toLowerCase().trim();
    return FREE_EMAIL_PROVIDERS.has(d);
  }

  // ================================================================
  //  User-Managed Custom Trusted/Blocked Domains
  //  Loaded from chrome.storage.local on startup. Users can add custom
  //  trusted domains or block built-in ones via the extension options.
  // ================================================================
  let userTrustedDomains = new Set();
  let userBlockedDomains = new Set();

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['customTrustedDomains', 'customBlockedDomains'], (result) => {
      if (result.customTrustedDomains && Array.isArray(result.customTrustedDomains)) {
        userTrustedDomains = new Set(result.customTrustedDomains.map(d => d.toLowerCase().trim()));
      }
      if (result.customBlockedDomains && Array.isArray(result.customBlockedDomains)) {
        userBlockedDomains = new Set(result.customBlockedDomains.map(d => d.toLowerCase().trim()));
      }
    });
  }

  /**
   * Check if a sender domain matches the trusted whitelist.
   * Checks: user blocked list → user trusted list → built-in list.
   * Also matches parent domains (e.g. em.washingtonpost.com → washingtonpost.com).
   */
  function isTrustedDomain(domain) {
    if (!domain) return false;
    const d = domain.toLowerCase().trim();

    // User explicitly blocked this domain → never trusted
    if (userBlockedDomains.has(d)) return false;
    // Check parent for blocked
    const parts = d.split('.');
    if (parts.length > 2) {
      const parent = parts.slice(-2).join('.');
      if (userBlockedDomains.has(parent)) return false;
    }

    // User explicitly trusted this domain
    if (userTrustedDomains.has(d)) return true;

    // Built-in list
    if (TRUSTED_DOMAINS.has(d)) return true;

    // Check parent: em.washingtonpost.com → washingtonpost.com
    if (parts.length > 2) {
      const parent = parts.slice(-2).join('.');
      if (userTrustedDomains.has(parent) || TRUSTED_DOMAINS.has(parent)) return true;
      // 3-level TLDs: bbc.co.uk
      if (parts.length > 3) {
        const parent3 = parts.slice(-3).join('.');
        if (userTrustedDomains.has(parent3) || TRUSTED_DOMAINS.has(parent3)) return true;
      }
    }
    return false;
  }

  /**
   * Detect newsletter / transactional email signals.
   * Returns a score 0-3 (0 = not a newsletter, 3 = definitely a newsletter).
   */
  function detectNewsletterSignals(emailData, features) {
    let signals = 0;
    const text = (emailData.text || '').toLowerCase();
    const links = emailData.links || [];

    // 1. Unsubscribe link present
    const hasUnsubscribe = links.some(l => {
      const href = (l.href || '').toLowerCase();
      const anchor = (l.anchorText || '').toLowerCase();
      return href.includes('unsubscribe') || href.includes('opt-out') ||
             href.includes('optout') || href.includes('email-preferences') ||
             href.includes('manage-preferences') || href.includes('notification-settings') ||
             anchor.includes('unsubscribe') || anchor.includes('opt out') ||
             anchor.includes('manage preferences') || anchor.includes('email preferences');
    });
    if (hasUnsubscribe) signals++;

    // 2. "View in browser" / "View online" link
    const hasViewInBrowser = links.some(l => {
      const anchor = (l.anchorText || '').toLowerCase();
      return anchor.includes('view in browser') || anchor.includes('view online') ||
             anchor.includes('view this email') || anchor.includes('read online') ||
             anchor.includes('web version');
    });
    if (hasViewInBrowser) signals++;

    // 3. Common newsletter / notification footer text
    if (text.includes('unsubscribe') || text.includes('opt out') ||
        text.includes('email preferences') || text.includes('manage your subscriptions') ||
        text.includes('you are receiving this') || text.includes('you received this') ||
        text.includes('sent to you because') || text.includes('mailing list') ||
        text.includes('no longer wish to receive') || text.includes('notification settings')) {
      signals++;
    }

    return signals;
  }

  // ================================================================
  //  Module Dependency Validation
  //  Ensures required classes are loaded before proceeding. The
  //  FeatureExtractor is mandatory; DnsChecker and PageAnalyzer are
  //  optional enhancements for Tier 2 (DNS) and Tier 3 (Deep Scan).
  // ================================================================
  if (typeof FeatureExtractor === 'undefined') {
    console.error('GoPhishFree: FeatureExtractor not loaded');
    return;
  }
  
  // ================================================================
  //  State Variables & Module Instances
  //  Core runtime state for the content script. The extractor builds
  //  feature vectors; dnsChecker and pageAnalyzer are optional Tier 2/3
  //  modules. Cached scan data enables rescore after deep scan.
  // ================================================================
  const extractor    = new FeatureExtractor();
  const dnsChecker   = (typeof DnsChecker   !== 'undefined') ? new DnsChecker()   : null;
  const pageAnalyzer = (typeof PageAnalyzer !== 'undefined') ? new PageAnalyzer() : null;

  let currentEmailId    = null;
  let scanInProgress    = false;
  let modelData         = null;      // Unified model (model/model_unified.json)
  let modelReady        = false;
  let enhancedScanning  = true;      // Tier 2 DNS checks toggle
  let aiEnhanceEnabled  = false;    // Enhance with AI toggle
  let browserlingEnabled = false;   // Open suspicious links via Browserling

  // Cached data from last scan
  let lastEmailData   = null;
  let lastFeatures    = null;
  let lastDnsFeatures = null;
  let lastPrediction  = null;
  let lastFishData    = null;
  let lastAiResult    = null;       // Last AI analysis result
  
  // ================================================================
  //  Bootstrap Sequence
  //  Initializes the extension: load user settings, then ML model,
  //  then create UI elements and start observing Gmail for email opens.
  // ================================================================
  loadSettings().then(() => loadModel()).then(() => {
    initUI();
    observeGmailChanges();
  });
  
  /**
   * Determine the fish type key based on a numeric risk score.
   * @param {number} riskScore - Integer risk score in range [0, 100].
   * @returns {string} One of 'shark', 'phishy', 'suspicious', or 'friendly'.
   */
  function getFishType(riskScore) {
    if (riskScore >= 90) return 'shark';
    if (riskScore >= 76) return 'phishy';
    if (riskScore >= 50) return 'suspicious';
    return 'friendly';
  }
  
  /**
   * Retrieve the full fish data object (emoji, name, description) for a risk score.
   * @param {number} riskScore - Integer risk score in range [0, 100].
   * @returns {Object} Fish data with properties: emoji, name, description, minRisk, maxRisk, type.
   */
  function getFishData(riskScore) {
    const type = getFishType(riskScore);
    return { ...FISH_TYPES[type], type };
  }

  /** Escape HTML special characters to prevent XSS in innerHTML. */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
    
  // ================================================================
  //  UI Initialization
  //  Creates and injects the side panel, overlay, and attaches event
  //  listeners for the close button, deep scan, and report phish actions.
  // ================================================================

  /**
   * Build and inject the GoPhishFree side panel and overlay into the Gmail DOM.
   * Sets up the analysis panel structure including score display, risk indicators,
   * suspicious links list, AI analysis section, deep scan controls, and report button.
   * @returns {void}
   */
  function initUI() {
    const overlay = document.createElement('div');
    overlay.className = 'gophishfree-overlay';
    overlay.id = 'gophishfree-overlay';
    document.body.appendChild(overlay);
    
    const sidepanel = document.createElement('div');
    sidepanel.className = 'gophishfree-sidepanel';
    sidepanel.id = 'gophishfree-sidepanel';
    sidepanel.innerHTML = `
      <div class="gophishfree-sidepanel-header">
        <img class="gophishfree-header-banner" src="${chrome.runtime.getURL('Assets/Banner.png')}" alt="GoPhishFree">
        <button class="gophishfree-sidepanel-close" id="gophishfree-close">\u00D7</button>
      </div>
      <div class="gophishfree-sidepanel-content" id="gophishfree-content">
        <div class="gophishfree-header-subtitle">Analysis</div>
        <div class="gophishfree-score-display">
          <div>Risk Score</div>
          <div class="gophishfree-score-value" id="gophishfree-score">-</div>
          <div class="gophishfree-fish-display" id="gophishfree-fish">\u{1F41F}</div>
          <div id="gophishfree-level">-</div>
        </div>
        <div class="gophishfree-reasons">
          <h3>Risk Indicators</h3>
          <div id="gophishfree-reasons-list"></div>
        </div>
        <div class="gophishfree-links">
          <h3>Suspicious Links</h3>
          <div id="gophishfree-links-list"></div>
        </div>
        <div class="gophishfree-ai-section" id="gophishfree-ai-section" style="display:none;">
          <div class="gophishfree-ai-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:14px;">\u{1F916}</span>
            <span style="font-size:13px;font-weight:600;color:#40e0d0;">AI Analysis</span>
            <span class="gophishfree-ai-badge" id="gophishfree-ai-badge" style="display:none;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:auto;"></span>
          </div>
          <div class="gophishfree-ai-scanning" id="gophishfree-ai-scanning" style="display:none;padding:10px;background:rgba(64,224,208,0.08);border-radius:10px;border:1px solid rgba(64,224,208,0.15);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="gophishfree-badge-spinner"></span>
              <span style="font-size:12px;color:#b8d4e3;">AI: Scanning...</span>
            </div>
          </div>
          <div class="gophishfree-ai-result" id="gophishfree-ai-result" style="display:none;padding:10px;background:rgba(64,224,208,0.08);border-radius:10px;border:1px solid rgba(64,224,208,0.15);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:12px;color:rgba(255,255,255,0.6);">AI Risk Score</span>
              <span id="gophishfree-ai-score" style="font-size:18px;font-weight:700;color:#40e0d0;">-</span>
            </div>
            <div id="gophishfree-ai-tier" style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;"></div>
            <div id="gophishfree-ai-signals" style="font-size:11px;color:rgba(255,255,255,0.7);"></div>
            <div id="gophishfree-ai-notes" style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:6px;font-style:italic;"></div>
          </div>
          <div class="gophishfree-ai-skipped" id="gophishfree-ai-skipped" style="display:none;padding:8px 10px;font-size:11px;color:rgba(255,255,255,0.4);"></div>
        </div>
        <div class="gophishfree-deepscan-section">
          <button class="gophishfree-deepscan-btn" id="gophishfree-deepscan-btn" disabled>
            <span class="gophishfree-deepscan-icon">\u{1F52C}</span>
            <span class="gophishfree-deepscan-label">Deep Scan Links</span>
          </button>
          <div class="gophishfree-deepscan-info">
            Fetches linked pages to analyze forms, resources &amp; structure.
            Only domain content is downloaded \u2014 no scripts are executed.
          </div>
          <div class="gophishfree-deepscan-progress" id="gophishfree-deepscan-progress" style="display:none;">
            <div class="gophishfree-deepscan-spinner"></div>
            <span id="gophishfree-deepscan-status">Scanning...</span>
          </div>
          <div class="gophishfree-deepscan-result" id="gophishfree-deepscan-result" style="display:none;"></div>
        </div>
        <div class="gophishfree-report-section">
          <button class="gophishfree-report-btn" id="gophishfree-report-btn" disabled>
            <span class="gophishfree-report-icon">\u{1F6A9}</span>
            <span class="gophishfree-report-label">Report Phish</span>
          </button>
          <div class="gophishfree-report-info">
            Manually flag this email as phishing and add it to your collection.
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sidepanel);
    
    document.getElementById('gophishfree-close').addEventListener('click', closeSidePanel);
    document.getElementById('gophishfree-deepscan-btn').addEventListener('click', triggerDeepScan);
    document.getElementById('gophishfree-report-btn').addEventListener('click', async () => {
      const severity = await showReportDialog();
      if (severity) handleReport(severity);
    });

    overlay.addEventListener('click', closeSidePanel);
  }
  
  // ================================================================
  //  Fish Caught Animation
  //  Displays a celebratory popup when a phishing email is caught or
  //  reported, showing the fish emoji, name, and risk score briefly.
  // ================================================================

  /**
   * Display a timed "fish caught" celebration popup overlay with the fish
   * emoji, name, description, and risk score. Auto-dismisses after 2.5 seconds.
   * @param {Object} fishData - Fish type data with emoji, name, and description.
   * @param {number} riskScore - The final risk score to display (0-100).
   * @returns {void}
   */
  function showFishCaughtAnimation(fishData, riskScore) {
    const splash = document.createElement('div');
    splash.className = 'gophishfree-splash-overlay';
    document.body.appendChild(splash);
    
    let scoreClass = 'low';
    if (riskScore >= 90) scoreClass = 'dangerous';
    else if (riskScore >= 76) scoreClass = 'high';
    else if (riskScore >= 50) scoreClass = 'medium';
    
    const popup = document.createElement('div');
    popup.className = 'gophishfree-fish-caught';
    popup.innerHTML = `
      <span class="gophishfree-fish-caught-icon">${fishData.emoji}</span>
      <div class="gophishfree-fish-caught-title">${fishData.name} Caught!</div>
      <div class="gophishfree-fish-caught-subtitle">${fishData.description}</div>
      <div class="gophishfree-fish-caught-score ${scoreClass}">Risk Score: ${riskScore}</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      popup.style.animation = 'fishCaughtPopup 0.3s ease-in reverse forwards';
      splash.style.opacity = '0';
      setTimeout(() => {
        popup.remove();
        splash.remove();
      }, 300);
    }, 2500);
  }
  
  // ================================================================
  //  Gmail DOM Observation
  //  Monitors Gmail for email navigation events using both URL polling
  //  (setInterval) and a MutationObserver on document.body. When a new
  //  email is detected, triggers the scan pipeline.
  // ================================================================

  /**
   * Start observing Gmail for email open events. Uses a combination of
   * URL change polling (every 1 second) and DOM MutationObserver to detect
   * when the user navigates to a new email thread.
   * @returns {void}
   */
  function observeGmailChanges() {
    checkEmailView();
    
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(checkEmailView, 500);
      }
    }, 1000);
    
    const observer = new MutationObserver(() => {
      checkEmailView();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * Check if the user is currently viewing an email and whether it is a
   * new email that hasn't been scanned yet. Extracts the email ID from
   * the Gmail URL hash or DOM attributes and triggers scanEmail() if new.
   * @returns {void}
   */
  function checkEmailView() {
    const urlMatch = window.location.href.match(/\/mail\/u\/\d+\/#inbox\/([a-zA-Z0-9]+)/);
    const emailId = urlMatch ? urlMatch[1] : null;
    
    const emailElement = document.querySelector('[data-message-id]') || 
                        document.querySelector('[data-legacy-thread-id]');
    const domEmailId = emailElement ? 
      (emailElement.getAttribute('data-message-id') || 
       emailElement.getAttribute('data-legacy-thread-id')) : null;
    
    const activeEmailId = emailId || domEmailId;
    
    if (activeEmailId && activeEmailId !== currentEmailId && !scanInProgress) {
      currentEmailId = activeEmailId;
      setTimeout(() => scanEmail(activeEmailId), 1000);
    }
  }
  
  // ================================================================
  //  Email Scanning Pipeline
  //  Main orchestrator: extracts email data from DOM, runs feature
  //  extraction, optional DNS checks, ML inference, displays results,
  //  persists to storage, and triggers AI analysis if enabled.
  // ================================================================

  /**
   * Perform a full phishing scan on the currently viewed email. Extracts email
   * data from the DOM, builds feature vectors, runs optional DNS checks (Tier 2),
   * performs ML inference, displays the risk badge and side panel, saves results
   * to extension storage, and auto-triggers AI analysis if enabled.
   * @param {string} emailId - Unique identifier for the email (from URL or DOM).
   * @returns {Promise<void>}
   */
  async function scanEmail(emailId) {
    if (scanInProgress) return;
    scanInProgress = true;

    showLoadingBadge();
    
    try {
      const emailData = extractEmailData();
      
      if (!emailData || !emailData.senderDomain) {
        removeLoadingBadge();
        scanInProgress = false;
        return;
      }
      
      // Extract all email features (URL, custom, BEC, attachment)
      const features = extractor.extractEmailFeatures(emailData);

      // Tier 2: DNS checks (if enabled)
      let dnsFeatures = null;
      if (enhancedScanning && dnsChecker) {
        try {
          const domains = [];
          if (emailData.senderDomain) domains.push(emailData.senderDomain);
          (emailData.links || []).forEach(link => {
            try {
              const hostname = new URL(link.href || link.url).hostname;
              if (hostname) domains.push(hostname);
            } catch (_) { /* skip bad URLs */ }
          });
          dnsFeatures = await dnsChecker.checkDomains(domains);
        } catch (err) {
          console.warn('GoPhishFree: DNS check failed, continuing without', err);
        }
      }

      // Run unified ML inference (no page features yet)
      const prediction = runInference(features, dnsFeatures, null, emailData);

      // Cache for deep scan rescore
      lastEmailData   = emailData;
      lastFeatures    = features;
      lastDnsFeatures = dnsFeatures;
      lastPrediction  = prediction;

      const fishData = getFishData(prediction.riskScore);
      lastFishData = fishData;

      // Enable buttons
      const dsBtn = document.getElementById('gophishfree-deepscan-btn');
      if (dsBtn) { dsBtn.disabled = false; }
      const rpBtn = document.getElementById('gophishfree-report-btn');
      if (rpBtn) {
        rpBtn.disabled = false;
        rpBtn.innerHTML = '<span class="gophishfree-report-icon">\u{1F6A9}</span><span class="gophishfree-report-label">Report Phish</span>';
      }
      const dsResult = document.getElementById('gophishfree-deepscan-result');
      if (dsResult) { dsResult.style.display = 'none'; }
      
      // Attach extra metadata to features for AI payload builder
      features._senderDomain = emailData.senderDomain || '';
      features._linkDomains = (emailData.links || []).map(l => {
        try { return new URL(l.href || l.url).hostname; } catch (_) { return ''; }
      }).filter(Boolean);
      features._senderSeenBefore = false; // placeholder for local cache

      displayResults(prediction, emailData, emailId, fishData);
      injectInlineBrowserlingButtons();

      // Save to storage
      chrome.runtime.sendMessage({
        action: 'saveScanResult',
        messageId: emailId,
        data: {
          senderDomain: emailData.senderDomain,
          senderDisplayName: emailData.senderDisplayName,
          riskScore: prediction.riskScore,
          riskLevel: prediction.riskLevel,
          reasons: prediction.reasons,
          linkCount: emailData.links.length,
          fishType: fishData.type,
          timestamp: Date.now()
        }
      }, (response) => {
        if (response && response.fishCollection) {
          }
      });

      // Auto-trigger AI analysis (if enabled, no extra button needed)
      runAiAnalysis(features, dnsFeatures, null, prediction);
      
    } catch (error) {
      console.error('GoPhishFree: Error scanning email', error);
      removeLoadingBadge();
    } finally {
      scanInProgress = false;
    }
  }
  
  // ================================================================
  //  Email Data Extraction from Gmail DOM
  //  Parses the Gmail page to extract sender info, links, body text,
  //  reply-to header, and attachment metadata from DOM elements.
  // ================================================================

  /**
   * Extract email metadata and content from the Gmail DOM. Queries for
   * sender email/display name, reply-to header, all anchor links, body
   * text content, and attachment filenames.
   * @returns {Object|null} Extracted email data object with properties:
   *   senderEmail, senderDisplayName, senderDomain, replyTo, links[], text,
   *   attachments[]. Returns null if extraction fails.
   */
  function extractEmailData() {
    try {
      const senderElement = document.querySelector('[email]') || 
                           document.querySelector('.go') ||
                           document.querySelector('span[email]');
      
      let senderEmail = '';
      let senderDisplayName = '';
      
      if (senderElement) {
        senderEmail = senderElement.getAttribute('email') || 
                     senderElement.textContent.trim();
        senderDisplayName = senderElement.textContent.trim();
      }
      
      const headerElements = document.querySelectorAll('h2, h3');
      for (const elem of headerElements) {
        const text = elem.textContent;
        if (text.includes('@')) {
          senderEmail = text.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || senderEmail;
          senderDisplayName = text.split('<')[0].trim() || senderDisplayName;
          break;
        }
      }
      
      const senderDomain = senderEmail.includes('@') 
        ? senderEmail.split('@')[1] 
        : null;

      // Attempt to extract reply-to (if present in DOM)
      let replyTo = '';
      const replyToEl = document.querySelector('[data-replyto]');
      if (replyToEl) {
        replyTo = replyToEl.getAttribute('data-replyto') || '';
      }
      
      // Extract links
      const links = [];
      const linkElements = document.querySelectorAll('a[href]');
      linkElements.forEach(link => {
        const href = link.getAttribute('href');
        const anchorText = link.textContent.trim();
        
        if (href && !href.startsWith('#') && !href.includes('mail.google.com')) {
          links.push({
            href: href,
            anchorText: anchorText,
            url: href
          });
        }
      });
      
      // Extract text content
      const messageBody = document.querySelector('[role="main"]') || 
                         document.querySelector('.ii.gt') ||
                         document.body;
      const text = messageBody ? messageBody.textContent : '';
      
      // Extract attachments
      const attachments = [];
      const attachmentElements = document.querySelectorAll('[data-attachment-id]');
      attachmentElements.forEach(att => {
        const filename = att.getAttribute('data-attachment-name') || 
                        att.textContent.trim();
        if (filename) {
          attachments.push({ filename });
        }
      });
      
      return {
        senderEmail,
        senderDisplayName: senderDisplayName || senderEmail,
        senderDomain,
        replyTo,
        links,
        text,
        attachments
      };
    } catch (error) {
      console.error('GoPhishFree: Error extracting email data', error);
      return null;
    }
  }
  
  // ================================================================
  //  Settings Management
  //  Loads user preferences from chrome.storage.local and listens for
  //  live changes to toggle scanning modes and domain lists.
  // ================================================================

  /**
   * Load user settings from chrome.storage.local, including enhanced scanning
   * (DNS checks) and AI enhancement toggles. Resolves when settings are loaded.
   * @returns {Promise<void>}
   */
  async function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(['enhancedScanning', 'aiEnhanceEnabled', 'browserlingEnabled'], data => {
        enhancedScanning = data.enhancedScanning !== false;
        aiEnhanceEnabled = !!data.aiEnhanceEnabled;
        browserlingEnabled = !!data.browserlingEnabled;
        resolve();
      });
    });
  }

  /**
   * Live listener for chrome.storage changes. Updates local state variables
   * when the user modifies settings in the extension options page.
   */
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enhancedScanning) {
      enhancedScanning = changes.enhancedScanning.newValue !== false;
    }
    if (changes.aiEnhanceEnabled) {
      aiEnhanceEnabled = !!changes.aiEnhanceEnabled.newValue;
    }
    if (changes.customTrustedDomains) {
      const arr = changes.customTrustedDomains.newValue || [];
      userTrustedDomains = new Set(arr.map(d => d.toLowerCase().trim()));
    }
    if (changes.customBlockedDomains) {
      const arr = changes.customBlockedDomains.newValue || [];
      userBlockedDomains = new Set(arr.map(d => d.toLowerCase().trim()));
    }
    if (changes.browserlingEnabled) {
      browserlingEnabled = !!changes.browserlingEnabled.newValue;
      const linksEl = document.getElementById('gophishfree-links-list');
      if (linksEl) linksEl.classList.toggle('browserling-enabled', browserlingEnabled);
      if (browserlingEnabled) {
        injectInlineBrowserlingButtons();
      } else {
        removeInlineBrowserlingButtons();
      }
    }
  });

  // ================================================================
  //  ML Model Loading (Unified)
  //  Fetches the Random Forest model JSON from the extension bundle.
  //  Tries model_unified.json first, falls back to legacy model_trees.json.
  //  The model contains decision trees, scaler params, and calibration data.
  // ================================================================

  /**
   * Load model/model_unified.json -- the single unified model.
   * Falls back to model/model_trees.json for backward compatibility.
   */
  async function loadModel() {
    try {
      let url = chrome.runtime.getURL('model/model_unified.json');
      let resp = await fetch(url);

      // Fallback to legacy model if unified not found
      if (!resp.ok) {
        console.warn('GoPhishFree: model_unified.json not found, trying legacy model_trees.json');
        url = chrome.runtime.getURL('model/model_trees.json');
        resp = await fetch(url);
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      modelData = await resp.json();

      if (modelData.trees && modelData.scaler_mean && modelData.scaler_scale) {
        modelReady = true;
      } else {
        console.warn('GoPhishFree: Model JSON missing required fields, falling back to rules');
      }
    } catch (err) {
      console.warn('GoPhishFree: Could not load ML model', err);
    }
  }

  // ================================================================
  //  Unified Inference Pipeline
  //  Builds the 64-feature vector, traverses the Random Forest, applies
  //  isotonic calibration, then applies post-model BEC boosts and
  //  trusted-domain dampening to produce the final risk score.
  // ================================================================

  /**
   * Run unified inference:
   *   1. Build 64-feature vector with context flags
   *   2. Traverse Random Forest for raw probability
   *   3. Apply isotonic calibration
   *   4. mlScore = round(100 * calibrated_prob)
   *   5. Apply post-model adjustments (BEC boosts, trusted domain dampening)
   *   6. Derive human-readable reasons from feature values
   *
   * Post-model adjustments compensate for the model being trained on URL
   * data but evaluated on full emails (BEC signals, newsletters, etc.).
   */
  function runInference(features, dnsFeatures, pageFeatures, emailData) {
    const flags = {
      dns_ran: dnsFeatures ? 1 : 0,
      deep_scan_ran: pageFeatures ? 1 : 0
    };

    const vector = extractor.buildUnifiedVector(features, dnsFeatures, pageFeatures, flags);

    let calibratedProb = 0.5;  // default if model unavailable

    if (modelReady) {
      calibratedProb = predictWithCalibratedForest(vector);
    }

    let riskScore = Math.round(100 * calibratedProb);
    const mlScore = riskScore;   // preserve original ML-only score
    const adjustReasons = [];    // track what adjustments were made

    const f = features || {};
    const senderDomain = (emailData && emailData.senderDomain) || '';

    // ════════════════════════════════════════════════════════════════
    //  POST-MODEL BOOST: BEC / social-engineering signals
    //  The model was trained on URL data and is blind to these.
    // ════════════════════════════════════════════════════════════════

    // Strong BEC: financial language + authority impersonation
    if ((f.FinancialRequestScore || 0) >= 2 && (f.AuthorityImpersonationScore || 0) >= 1) {
      if (riskScore < 80) {
        riskScore = Math.max(riskScore, 80);
        adjustReasons.push('BEC signals: financial request + authority impersonation');
      }
    }
    // Phone callback lure with financial request
    else if ((f.PhoneCallbackPattern || 0) > 0 && (f.FinancialRequestScore || 0) >= 1) {
      if (riskScore < 75) {
        riskScore = Math.max(riskScore, 75);
        adjustReasons.push('Phone callback lure with financial language');
      }
    }
    // Linkless + urgency + financial language (advance-fee scam pattern)
    else if ((f.IsLinkless || 0) > 0 && (f.UrgencyScore || 0) >= 2 && (f.FinancialRequestScore || 0) >= 1) {
      if (riskScore < 75) {
        riskScore = Math.max(riskScore, 75);
        adjustReasons.push('Linkless email with urgency + financial language');
      }
    }
    // Medium BEC: financial language alone (moderate boost)
    else if ((f.FinancialRequestScore || 0) >= 3) {
      if (riskScore < 60) {
        riskScore = Math.max(riskScore, 60);
        adjustReasons.push('Strong financial request language');
      }
    }
    // Authority impersonation alone (moderate boost)
    else if ((f.AuthorityImpersonationScore || 0) >= 2) {
      if (riskScore < 55) {
        riskScore = Math.max(riskScore, 55);
        adjustReasons.push('Authority impersonation language');
      }
    }

    // Reply-to mismatch always boosts (strong phishing signal)
    if ((f.ReplyToMismatch || 0) > 0) {
      riskScore = Math.max(riskScore, Math.min(riskScore + 15, 100));
      adjustReasons.push('Reply-to domain mismatch');
    }

    // Risky attachment with urgency (attachment-led phishing)
    if ((f.RiskyAttachmentExtension || 0) > 0 && (f.UrgencyScore || 0) >= 1) {
      if (riskScore < 70) {
        riskScore = Math.max(riskScore, 70);
        adjustReasons.push('Risky attachment with urgency language');
      }
    }

    // Double extension is almost always malicious
    if ((f.DoubleExtensionFlag || 0) > 0) {
      if (riskScore < 80) {
        riskScore = Math.max(riskScore, 80);
        adjustReasons.push('Attachment uses double extension (likely disguised)');
      }
    }

    // ════════════════════════════════════════════════════════════════
    //  POST-MODEL DAMPENING: Trusted domains & newsletter detection
    //  Prevents false positives on legitimate newsletters/notifications.
    // ════════════════════════════════════════════════════════════════

    const trusted = isTrustedDomain(senderDomain);
    const freeProvider = isFreeEmailProvider(senderDomain);
    const newsletterScore = emailData ? detectNewsletterSignals(emailData, f) : 0;

    // Only dampen if no strong phishing signals are present
    const hasBecSignals = (f.FinancialRequestScore || 0) >= 2 ||
                          (f.AuthorityImpersonationScore || 0) >= 2 ||
                          (f.PhoneCallbackPattern || 0) > 0 ||
                          (f.ReplyToMismatch || 0) > 0;
    const hasRiskyAttach = (f.RiskyAttachmentExtension || 0) > 0 ||
                           (f.DoubleExtensionFlag || 0) > 0;

    if (trusted && !hasBecSignals && !hasRiskyAttach && (f.HeaderMismatch || 0) === 0) {
      // Trusted corporate domain with no phishing signals → cap at Low
      const cap = 30;
      if (riskScore > cap) {
        riskScore = cap;
        adjustReasons.push(`Trusted sender (${senderDomain}) — score capped`);
      }
    } else if (freeProvider && riskScore >= 50) {
      // Free email provider (gmail, outlook, icloud, etc.) — never auto-trusted.
      // Anyone can register on these, so we don't dampen the score.
      adjustReasons.push(`Free email provider (${senderDomain}) — not auto-trusted`);
    } else if (!trusted && !freeProvider && newsletterScore >= 2 && !hasBecSignals && !hasRiskyAttach) {
      // Strong newsletter signals from unknown domain → moderate dampening
      const cap = 45;
      if (riskScore > cap) {
        riskScore = Math.min(riskScore, cap);
        adjustReasons.push('Newsletter signals detected (unsubscribe, footer text)');
      }
    } else if (trusted && (hasBecSignals || hasRiskyAttach || (f.HeaderMismatch || 0) > 0)) {
      // Trusted domain BUT phishing signals → possible spoofing, no dampening
      adjustReasons.push('Trusted domain with suspicious signals — possible spoofing');
    }

    // ════════════════════════════════════════════════════════════════
    //  Final score and reasons
    // ════════════════════════════════════════════════════════════════

    riskScore = Math.max(0, Math.min(100, riskScore));

    // Derive human-readable reasons from feature values
    const reasons = deriveReasons(features, dnsFeatures, pageFeatures, calibratedProb);

    // Prepend adjustment reasons so user sees why score was modified
    const allReasons = [...adjustReasons, ...reasons];

    let riskLevel = 'Low';
    if (riskScore >= 90) riskLevel = 'Dangerous';
    else if (riskScore >= 76) riskLevel = 'High';
    else if (riskScore >= 50) riskLevel = 'Medium';

    // Confidence: distance from 0.5 threshold, scaled to 0-1
    const confidence = Math.min(1, Math.abs(calibratedProb - 0.5) * 2);

    return {
      riskScore,
      mlScore,           // original ML-only score (before adjustments)
      riskLevel,
      mlProbability: +calibratedProb.toFixed(3),
      confidence: +confidence.toFixed(2),
      dnsChecked: !!dnsFeatures,
      deepScanned: !!pageFeatures,
      adjustReasons,
      trustedDomain: trusted,
      newsletterScore,
      reasons: allReasons.slice(0, 8)
    };
  }

  // ================================================================
  //  Calibrated Random Forest Prediction
  //  Z-score normalizes the feature vector, traverses each decision tree
  //  for a soft-vote probability, then applies isotonic calibration to
  //  map raw probabilities to calibrated phishing probabilities.
  // ================================================================

  /**
   * Traverse the Random Forest, get raw soft-vote probability,
   * then apply the isotonic calibration mapping from the model JSON.
   */
  function predictWithCalibratedForest(rawFeatures) {
    const { scaler_mean, scaler_scale, trees, calibration } = modelData;

    // Z-score normalization
    const scaled = rawFeatures.map((v, i) => (v - scaler_mean[i]) / scaler_scale[i]);

    // Soft-vote probability from all trees
    let phishingProbSum = 0;
    for (const tree of trees) {
      let node = 0;
      while (tree.children_left[node] !== -1) {
        const fi = tree.feature[node];
        if (scaled[fi] <= tree.threshold[node]) {
          node = tree.children_left[node];
        } else {
          node = tree.children_right[node];
        }
      }
      const counts = tree.value[node];
      const total = counts[0] + counts[1];
      phishingProbSum += total > 0 ? counts[1] / total : 0;
    }

    const rawProb = phishingProbSum / trees.length;

    // Apply calibration if available
    if (calibration && calibration.x_values && calibration.y_values) {
      return applyIsotonicCalibration(rawProb, calibration.x_values, calibration.y_values);
    }

    // Fallback: return raw probability
    return rawProb;
  }

  /**
   * Isotonic calibration: binary search in x_values, linear interpolation
   * between nearest y_values.
   */
  function applyIsotonicCalibration(rawProb, xVals, yVals) {
    const n = xVals.length;
    if (n === 0) return rawProb;

    // Clamp to range
    if (rawProb <= xVals[0]) return yVals[0];
    if (rawProb >= xVals[n - 1]) return yVals[n - 1];

    // Binary search for the interval
    let lo = 0, hi = n - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (xVals[mid] <= rawProb) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    // Linear interpolation
    const x0 = xVals[lo], x1 = xVals[hi];
    const y0 = yVals[lo], y1 = yVals[hi];

    if (x1 === x0) return y0;
    const t = (rawProb - x0) / (x1 - x0);
    return y0 + t * (y1 - y0);
  }

  // ================================================================
  //  Reason Derivation (Read-Only)
  //  Inspects feature values to generate human-readable risk indicator
  //  strings for the side panel UI. Does NOT modify the risk score.
  // ================================================================

  /**
   * Generate human-readable reasons by inspecting feature values.
   * This function does NOT modify the risk score -- it only produces
   * text explanations for the UI.
   */
  function deriveReasons(features, dnsFeatures, pageFeatures, calibratedProb) {
    const reasons = [];
    const f = features || {};

    // ML confidence reason
    if (calibratedProb >= 0.6) {
      reasons.push('ML model detected phishing patterns in email structure');
    }

    // -- URL/Link indicators --
    if (f.Punycode > 0) {
      reasons.push('Links contain punycode (possible homograph attack)');
    }
    if (f.LinkMismatchRatio > 0.3) {
      reasons.push('Link text does not match destination domains');
    } else if (f.LinkMismatchCount > 0) {
      reasons.push('Some link text does not match destination');
    }
    if (f.HeaderMismatch > 0) {
      reasons.push('Sender display name does not match email domain');
    }
    if (f.ShortenerDomain > 0) {
      reasons.push('Links use URL shorteners');
    }
    if (f.SuspiciousTLD > 0) {
      reasons.push('Links use suspicious top-level domains');
    }
    if (f.IpAddress > 0) {
      reasons.push('Links point to IP addresses instead of domain names');
    }
    if (f.NoHttps > 0 && f.UrlLength > 0) {
      reasons.push('Links use insecure HTTP connections');
    }

    // -- Content indicators --
    if (f.CredentialRequestScore > 0) {
      reasons.push('Email requests credentials or account verification');
    }
    if (f.UrgencyScore > 2) {
      reasons.push('Email contains urgency language');
    }

    // -- BEC / Linkless indicators --
    if (f.FinancialRequestScore > 0) {
      reasons.push('Email contains financial request language (wire, invoice, payment)');
    }
    if (f.AuthorityImpersonationScore > 0) {
      reasons.push('Email impersonates authority figure (CEO, IT, HR)');
    }
    if (f.PhoneCallbackPattern > 0) {
      reasons.push('Email contains phone callback lure pattern');
    }
    if (f.ReplyToMismatch > 0) {
      reasons.push('Reply-to address domain differs from sender');
    }
    if (f.IsLinkless > 0 && calibratedProb >= 0.5) {
      reasons.push('Linkless email with suspicious content patterns');
    }

    // -- Attachment indicators --
    if (f.RiskyAttachmentExtension > 0) {
      reasons.push('Attachment has a risky file extension');
    }
    if (f.DoubleExtensionFlag > 0) {
      reasons.push('Attachment uses double file extension (disguised type)');
    }
    if (f.HasAttachment > 0 && f.AttachmentNameEntropy > 4.0) {
      reasons.push('Attachment filename appears randomly generated');
    }

    // -- DNS indicators --
    if (dnsFeatures) {
      if (dnsFeatures.DomainExists === 0) {
        reasons.push('Link domain does not resolve (DNS lookup failed)');
      }
      if (dnsFeatures.RandomStringDomain === 1) {
        reasons.push('Domain name appears randomly generated');
      }
      if (dnsFeatures.UnresolvedDomains > 1) {
        reasons.push(`${dnsFeatures.UnresolvedDomains} link domains could not be resolved`);
      }
      if (dnsFeatures.HasMXRecord === 0 && dnsFeatures.DomainExists === 1) {
        reasons.push('Sender domain has no mail server (MX) record');
      }
    }

    // -- Deep Scan page indicators --
    if (pageFeatures) {
      if (pageFeatures.InsecureForms > 0)     reasons.push('Linked page contains insecure forms');
      if (pageFeatures.ExtFormAction > 0)      reasons.push('Linked page submits data to external domain');
      if (pageFeatures.IframeOrFrame > 0)      reasons.push('Linked page uses hidden iframes');
      if (pageFeatures.MissingTitle > 0)       reasons.push('Linked page has no title');
      if (pageFeatures.EmbeddedBrandName > 0)  reasons.push('Linked page impersonates a well-known brand');
      if (pageFeatures.SubmitInfoToEmail > 0)  reasons.push('Linked page form submits to email');
    }

    return reasons;
  }

  // ================================================================
  //  AI Enhancement (Cloud BYOK)
  //  Optional cloud-based AI analysis using the user's own API key.
  //  Builds a privacy-preserving payload (features only, no raw text),
  //  gates the call based on local confidence, and displays results
  //  in the side panel with an agreement badge.
  // ================================================================

  /**
   * Build a features-only payload for the AI provider.
   * No email body, subject, or sender address is ever sent.
   */
  function buildAiPayload(features, dnsFeatures, pageFeatures, localResult) {
    const f = features || {};
    const d = dnsFeatures || null;
    const p = pageFeatures || null;

    const payload = {
      // Email identity / header signals
      email_signals: {
        reply_to_mismatch: !!(f.ReplyToMismatch && f.ReplyToMismatch > 0),
        from_domain: f._senderDomain || 'unknown',
        sender_seen_before: !!(f._senderSeenBefore),
        displayname_mismatch_score: 0
      },

      // URL / link signals
      url_signals: {
        link_count: f.NumLinks || 0,
        link_domains: (f._linkDomains || []).slice(0, 10),
        has_shortener: !!(f.HasShortenedUrl && f.HasShortenedUrl > 0),
        has_ip_url: !!(f.IpAddress && f.IpAddress > 0),
        punycode_present: !!(f.Punycode && f.Punycode > 0),
        suspicious_tld_present: !!(f.SuspiciousTLD && f.SuspiciousTLD > 0),
        url_entropy_score: Math.min(1, (f.AvgPathEntropy || 0) / 5),
        mismatch_link_text_domain: !!(f.LinkMismatchRatio && f.LinkMismatchRatio > 0.3)
      },

      // Language / rule cues (no raw text)
      language_cues: {
        urgency_score: Math.min(1, (f.UrgencyScore || 0) / 3),
        credential_score: Math.min(1, (f.CredentialPhishingScore || 0) / 3),
        financial_request_score: Math.min(1, (f.FinancialRequestScore || 0) / 3),
        callback_score: Math.min(1, (f.PhoneCallbackPattern || 0)),
        secrecy_score: Math.min(1, (f.SecrecyLanguageScore || 0) / 3)
      },

      // Attachment metadata
      attachment_signals: {
        has_attachment: !!(f.HasAttachment && f.HasAttachment > 0),
        attachment_count: f.AttachmentCount || 0,
        risky_attachment_ext_present: !!(f.RiskyAttachmentExtension && f.RiskyAttachmentExtension > 0),
        double_extension_present: !!(f.DoubleExtensionFlag && f.DoubleExtensionFlag > 0)
      },

      // DNS signals (if ran)
      dns_signals: d ? {
        dns_ran: true,
        domain_resolves: !!(d.DomainExists && d.DomainExists > 0),
        mx_present: !!(d.MXRecordCount && d.MXRecordCount > 0),
        a_record_count_bucket: Math.min(3, d.ARecordCount || 0)
      } : {
        dns_ran: false
      },

      // Deep scan signals (if ran)
      deep_scan_signals: p ? {
        deep_scan_ran: true,
        has_form: !!(p.HasFormTag && p.HasFormTag > 0),
        has_password_input: !!(p.HasPasswordInput && p.HasPasswordInput > 0),
        form_action_off_domain: !!(p.FormActionDiffDomain && p.FormActionDiffDomain > 0),
        iframe_count_bucket: Math.min(2, p.IframeOrEmbed || 0),
        redirect_count_bucket: Math.min(2, p.MetaRefresh || 0)
      } : {
        deep_scan_ran: false
      },

      // Local model output
      local_model: {
        local_risk_score: localResult.riskScore || 0,
        local_confidence: localResult.confidence || 0,
        top_local_reasons: (localResult.reasons || []).slice(0, 5)
      }
    };

    return payload;
  }

  /**
   * Determine whether AI analysis would be useful for this scan.
   * Gates the call to reduce latency and cost when local model is confident.
   */
  function shouldCallAi(features, dnsFeatures, pageFeatures, localResult) {
    const score = localResult.riskScore || 0;
    const confidence = localResult.confidence || 0;
    const f = features || {};
    const p = pageFeatures || null;

    // Call AI if local risk is in the uncertain mid-range (30-80)
    if (score >= 30 && score <= 80) return true;

    // Call AI if local confidence is low
    if (confidence < 0.6) return true;

    // Call AI if deep scan found forms/passwords/off-domain action
    if (p) {
      if (p.HasFormTag > 0 || p.HasPasswordInput > 0 || p.FormActionDiffDomain > 0) return true;
    }

    // Call AI if risky attachment present
    if (f.RiskyAttachmentExtension > 0 || f.DoubleExtensionFlag > 0) return true;

    // Call AI if reply-to mismatch
    if (f.ReplyToMismatch > 0) return true;

    // Otherwise, local model is confident enough
    return false;
  }

  /**
   * Run AI analysis after local scoring (auto-triggered, no extra button).
   * Updates the side panel with results.
   */
  async function runAiAnalysis(features, dnsFeatures, pageFeatures, localResult) {
    if (!aiEnhanceEnabled) return;

    const aiSection = document.getElementById('gophishfree-ai-section');
    const scanningEl = document.getElementById('gophishfree-ai-scanning');
    const resultEl = document.getElementById('gophishfree-ai-result');
    const skippedEl = document.getElementById('gophishfree-ai-skipped');
    const badgeEl = document.getElementById('gophishfree-ai-badge');

    if (!aiSection) return;

    // Show AI section
    aiSection.style.display = 'block';

    // Reset state
    if (scanningEl) scanningEl.style.display = 'none';
    if (resultEl) resultEl.style.display = 'none';
    if (skippedEl) skippedEl.style.display = 'none';
    if (badgeEl) badgeEl.style.display = 'none';
    lastAiResult = null;

    // Check gating
    if (!shouldCallAi(features, dnsFeatures, pageFeatures, localResult)) {
      if (skippedEl) {
        skippedEl.style.display = 'block';
        skippedEl.textContent = 'AI not needed (high confidence local scan)';
      }
      return;
    }

    // Show scanning state
    if (scanningEl) scanningEl.style.display = 'block';

    try {
      const payload = buildAiPayload(features, dnsFeatures, pageFeatures, localResult);

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'runAiAnalysis', payload },
          (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!resp || !resp.success) {
              reject(new Error(resp?.error || 'AI unavailable'));
              return;
            }
            resolve(resp.result);
          }
        );
      });

      lastAiResult = response;
      displayAiResult(response, localResult.riskScore);
    } catch (err) {
      console.warn('GoPhishFree: AI analysis failed -', err.message);
      if (scanningEl) scanningEl.style.display = 'none';
      if (skippedEl) {
        skippedEl.style.display = 'block';
        skippedEl.textContent = 'AI unavailable';
      }
    }
  }

  /**
   * Display AI analysis results in the side panel.
   */
  function displayAiResult(result, localScore) {
    const scanningEl = document.getElementById('gophishfree-ai-scanning');
    const resultEl = document.getElementById('gophishfree-ai-result');
    const scoreEl = document.getElementById('gophishfree-ai-score');
    const tierEl = document.getElementById('gophishfree-ai-tier');
    const signalsEl = document.getElementById('gophishfree-ai-signals');
    const notesEl = document.getElementById('gophishfree-ai-notes');
    const badgeEl = document.getElementById('gophishfree-ai-badge');

    if (scanningEl) scanningEl.style.display = 'none';
    if (!resultEl) return;

    resultEl.style.display = 'block';

    // AI Risk Score
    if (scoreEl) {
      scoreEl.textContent = result.aiRiskScore;
      scoreEl.style.color =
        result.aiRiskScore >= 80 ? '#ff6b6b' :
        result.aiRiskScore >= 60 ? '#ffa726' :
        result.aiRiskScore >= 30 ? '#ffc107' : '#40e0d0';
    }

    // Tier
    if (tierEl) {
      const tierColors = { Safe: '#40e0d0', Caution: '#ffc107', Suspicious: '#ffa726', Dangerous: '#ff6b6b' };
      tierEl.textContent = '';
      const tierSpan = document.createElement('span');
      tierSpan.style.color      = tierColors[result.riskTier] || '#b8d4e3';
      tierSpan.style.fontWeight = '600';
      tierSpan.textContent = result.riskTier;
      tierEl.appendChild(tierSpan);
      if (result.phishType?.length) {
        const types = document.createTextNode(' \u2022 ' + result.phishType.join(', '));
        tierEl.appendChild(types);
      }
    }

    // Top Signals
    if (signalsEl && result.topSignals?.length) {
      signalsEl.innerHTML = result.topSignals
        .map(s => `<div style="margin-top:3px;">\u26A0 ${escapeHtml(s)}</div>`)
        .join('');
    }

    // Notes
    if (notesEl && result.notes) {
      notesEl.textContent = result.notes;
    }

    // Agreement badge
    if (badgeEl) {
      const diff = Math.abs(result.aiRiskScore - localScore);
      if (diff > 20) {
        badgeEl.style.display = 'inline';
        badgeEl.style.background = 'rgba(255,193,7,0.2)';
        badgeEl.style.color = '#ffc107';
        badgeEl.textContent = 'Needs review';
      } else {
        badgeEl.style.display = 'inline';
        badgeEl.style.background = 'rgba(64,224,208,0.2)';
        badgeEl.style.color = '#40e0d0';
        badgeEl.textContent = 'Aligned';
      }
    }
  }

  // ================================================================
  //  Deep Scan Pipeline (Tier 3)
  //  Fetches linked pages' HTML via the background service worker,
  //  parses them safely with DOMParser (no script execution), extracts
  //  page-level features (forms, iframes, brand impersonation), then
  //  re-runs the same unified model with deep_scan_ran=1 for a rescore.
  // ================================================================

  /**
   * User clicked "Deep Scan" - fetch linked pages, extract page features,
   * re-run the SAME unified model with deep_scan_ran=1 and page features.
   */
  async function triggerDeepScan() {
    if (!lastEmailData || !lastFeatures) return;

    const ok = confirm(
      'Deep Scan will download the HTML of linked pages to analyze their ' +
      'structure (forms, resources, iframes).\n\n' +
      'Safety measures:\n' +
      '\u2022 Only the HTML text is downloaded \u2014 no scripts are executed\n' +
      '\u2022 No cookies or login sessions are sent\n' +
      '\u2022 All analysis happens locally in your browser\n' +
      '\u2022 Downloaded content is immediately discarded after analysis\n\n' +
      'Continue?'
    );
    if (!ok) return;

    const btn      = document.getElementById('gophishfree-deepscan-btn');
    const progress = document.getElementById('gophishfree-deepscan-progress');
    const status   = document.getElementById('gophishfree-deepscan-status');
    const result   = document.getElementById('gophishfree-deepscan-result');

    btn.disabled = true;
    btn.classList.add('scanning');
    progress.style.display = 'flex';
    result.style.display   = 'none';
    status.textContent     = 'Requesting permission...';
    showDeepScanLoadingBadge();

    try {
      // 1. Request host permission via background
      const granted = await new Promise(resolve => {
        chrome.runtime.sendMessage(
          { action: 'requestPermissions' },
          resp => resolve(resp && resp.granted)
        );
      });
      if (!granted) {
        status.textContent =
          'Permission required. If no prompt appeared, try clicking the ' +
          'GoPhishFree icon in the toolbar and re-opening the email.';
        btn.disabled = false;
        btn.classList.remove('scanning');
        restorePreviousBadge();
        return;
      }

      // 2. Collect unique link URLs
      status.textContent = 'Collecting links...';
      const linkUrls = [];
      (lastEmailData.links || []).forEach(link => {
        const href = link.href || link.url;
        if (!href) return;
        try {
          const parsed = new URL(href);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            linkUrls.push(parsed.href);
          }
        } catch (_) { /* skip malformed URLs */ }
      });
      const uniqueUrls = [...new Set(linkUrls)].slice(0, 10);

      if (uniqueUrls.length === 0) {
        status.textContent = 'No scannable links found.';
        btn.disabled = false;
        btn.classList.remove('scanning');
        restorePreviousBadge();
        return;
      }

      // 3. Fetch each page via background service worker
      status.textContent = `Scanning 0/${uniqueUrls.length} pages...`;
      const pageFeaturesList = [];
      let successCount = 0;
      let failCount    = 0;

      for (let i = 0; i < uniqueUrls.length; i++) {
        status.textContent = `Scanning ${i + 1}/${uniqueUrls.length} pages...`;

        const html = await new Promise(resolve => {
          chrome.runtime.sendMessage(
            { action: 'fetchPageHTML', url: uniqueUrls[i] },
            resp => resolve(resp && resp.success ? resp.html : null)
          );
        });

        if (html && pageAnalyzer) {
          try {
            const safeHtml = html.length > 2_000_000 ? html.slice(0, 2_000_000) : html;
            const parser = new DOMParser();
            const doc = parser.parseFromString(safeHtml, 'text/html');

            if (doc.querySelectorAll('*').length > 50_000) {
              failCount++; // oversized DOM — skip
            } else {
              const feats = pageAnalyzer.extractFeatures(doc, uniqueUrls[i]);
              pageFeaturesList.push(feats);
              successCount++;
            }
          } catch (_) { failCount++; }
        } else {
          failCount++;
        }
      }

      // 4. Aggregate page features (worst-case across all scanned pages)
      //    Returns null if nothing was fetched — runInference must handle null.
      const aggregatedPage = aggregatePageFeatures(pageFeaturesList);

      // 5. Re-run the SAME unified model with page features filled in
      status.textContent = 'Rescoring with page analysis...';
      const prevScore      = lastPrediction ? lastPrediction.riskScore : null;
      const newPrediction  = runInference(lastFeatures, lastDnsFeatures, aggregatedPage, lastEmailData);

      // 6. Display updated score
      progress.style.display = 'none';
      showDeepScanResult(newPrediction, aggregatedPage, successCount, failCount, prevScore);

    } catch (err) {
      console.error('GoPhishFree: Deep scan failed', err);
      status.textContent = 'Deep scan failed: ' + err.message;
      restorePreviousBadge();
    } finally {
      btn.classList.remove('scanning');
      btn.disabled = false;
    }
  }

  /**
   * Aggregate page features across multiple pages (worst-case / max).
   * Returns null when no pages were successfully fetched — callers must
   * treat null as "deep scan produced no page data" and not treat it the
   * same as a scan that found clean pages.
   */
  function aggregatePageFeatures(featsList) {
    if (!featsList || featsList.length === 0) return null;
    const agg = { ...featsList[0] };
    for (let i = 1; i < featsList.length; i++) {
      for (const key of Object.keys(agg)) {
        agg[key] = Math.max(agg[key], featsList[i][key] || 0);
      }
    }
    return agg;
  }

  /**
   * Show deep scan result: update score, reasons, and findings summary.
   */
  function showDeepScanResult(prediction, pageFeatures, successCount, failCount, prevScore) {
    const resultEl  = document.getElementById('gophishfree-deepscan-result');
    const scoreEl   = document.getElementById('gophishfree-score');
    const levelEl   = document.getElementById('gophishfree-level');
    const fishEl    = document.getElementById('gophishfree-fish');
    const reasonsEl = document.getElementById('gophishfree-reasons-list');

    // --- Case: all page fetches failed — don't pretend scan ran ---
    if (successCount === 0) {
      resultEl.style.display = 'block';
      resultEl.textContent = '';

      const badge = document.createElement('div');
      badge.className = 'gophishfree-deepscan-badge incomplete';
      badge.textContent = 'Deep Scan Incomplete';
      resultEl.appendChild(badge);

      const msg = document.createElement('div');
      msg.className = 'gophishfree-deepscan-finding';
      msg.textContent = failCount > 0
        ? `Could not reach any of the ${failCount} linked page(s). The original score has not changed.`
        : 'No linked pages were found to scan.';
      resultEl.appendChild(msg);

      restorePreviousBadge();
      return;
    }

    // --- Update risk badge + score with animation ---
    const fishData = getFishData(prediction.riskScore);
    updateRiskBadge(prediction.riskLevel, prediction.riskScore, fishData);
    lastPrediction = prediction;
    lastFishData   = fishData;

    scoreEl.classList.add('gophishfree-score-updating');
    setTimeout(() => {
      scoreEl.textContent = prediction.riskScore;
      scoreEl.className   = 'gophishfree-score-value ' + prediction.riskLevel.toLowerCase();
      levelEl.textContent = prediction.riskLevel + ' Risk - ' + fishData.name;
      fishEl.textContent  = fishData.emoji;
      scoreEl.classList.remove('gophishfree-score-updating');
    }, 300);

    // --- Update reasons list ---
    reasonsEl.textContent = '';
    prediction.reasons.forEach(reason => {
      const item = document.createElement('div');
      item.className   = 'gophishfree-reason-item';
      item.textContent = reason;
      reasonsEl.appendChild(item);
    });

    // --- Build findings from real page features ---
    const findings = [];
    if (pageFeatures) {
      if (pageFeatures.InsecureForms)              findings.push('Insecure forms detected');
      if (pageFeatures.ExtFormAction)              findings.push('External form actions found');
      if (pageFeatures.IframeOrFrame)              findings.push('Hidden iframes found');
      if (pageFeatures.MissingTitle)               findings.push('Linked page has no title');
      if (pageFeatures.EmbeddedBrandName)          findings.push('Brand impersonation detected');
      if (pageFeatures.PctExtHyperlinks > 0.5)     findings.push('Mostly external links on page');
      if (pageFeatures.SubmitInfoToEmail)          findings.push('Form submits data to an email address');
    }

    // --- Assemble result panel using safe DOM methods only ---
    resultEl.textContent = '';
    resultEl.style.display = 'block';

    const badge = document.createElement('div');
    badge.className   = 'gophishfree-deepscan-badge';
    badge.textContent = 'Deep Scan Complete';
    resultEl.appendChild(badge);

    // Score delta line
    if (prevScore !== null && prevScore !== undefined) {
      const delta     = prediction.riskScore - prevScore;
      const deltaEl   = document.createElement('div');
      deltaEl.className = 'gophishfree-deepscan-finding';
      const arrow = delta > 0 ? '\u25b2' : delta < 0 ? '\u25bc' : '\u25cf';
      deltaEl.textContent = arrow + ' Score: ' + prevScore + ' \u2192 ' + prediction.riskScore +
        (delta !== 0 ? ' (' + (delta > 0 ? '+' : '') + delta + ')' : ' (unchanged)');
      resultEl.appendChild(deltaEl);
    }

    // Findings list
    const findingsWrap = document.createElement('div');
    findingsWrap.className = 'gophishfree-deepscan-findings';

    if (findings.length > 0) {
      findings.forEach(f => {
        const row = document.createElement('div');
        row.className   = 'gophishfree-deepscan-finding';
        row.textContent = '\u2022 ' + f;
        findingsWrap.appendChild(row);
      });
    } else {
      const row = document.createElement('div');
      row.className   = 'gophishfree-deepscan-finding safe';
      row.textContent = 'No additional threats found in page structure.';
      findingsWrap.appendChild(row);
    }
    resultEl.appendChild(findingsWrap);

    // Stats footer
    const stats = document.createElement('div');
    stats.className   = 'gophishfree-deepscan-finding';
    stats.style.marginTop = '6px';
    stats.style.opacity   = '0.6';
    stats.style.fontSize  = '0.78em';
    stats.textContent = successCount + ' page' + (successCount !== 1 ? 's' : '') + ' scanned' +
      (failCount > 0 ? ', ' + failCount + ' unreachable' : '');
    resultEl.appendChild(stats);

    // Re-run AI analysis with deep scan data (auto, no extra button)
    if (lastFeatures) {
      runAiAnalysis(lastFeatures, lastDnsFeatures, pageFeatures, prediction);
    }
  }
  
  // ================================================================
  //  User Report Pipeline
  //  Allows the user to manually flag an email as phishing by selecting
  //  a severity level. Overrides the ML score with the user's assessment,
  //  saves the report to storage, and triggers the fish caught animation.
  // ================================================================

  const REPORT_SEVERITY = {
    low:       { riskScore: 25,  riskLevel: 'Low',       fishType: 'friendly'   },
    medium:    { riskScore: 63,  riskLevel: 'Medium',    fishType: 'suspicious' },
    high:      { riskScore: 82,  riskLevel: 'High',      fishType: 'phishy'     },
    dangerous: { riskScore: 95,  riskLevel: 'Dangerous', fishType: 'shark'      }
  };

  /**
   * Display a modal dialog for the user to select a phishing severity level.
   * Presents four options (low, medium, high, dangerous) with fish themes.
   * Returns a promise that resolves with the selected severity string or null.
   * @returns {Promise<string|null>} The selected severity ('low'|'medium'|'high'|'dangerous') or null if cancelled.
   */
  function showReportDialog() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'gophishfree-report-overlay';

      const card = document.createElement('div');
      card.className = 'gophishfree-report-card';
      card.innerHTML = `
        <div class="gophishfree-report-card-title">Report Phishing Email</div>
        <div class="gophishfree-report-card-subtitle">How dangerous do you think this email is?</div>
        <div class="gophishfree-report-options">
          <button class="gophishfree-report-option low" data-severity="low">
            <span class="gophishfree-report-option-fish">\u{1F41F}</span>
            <span class="gophishfree-report-option-label">Low Risk</span>
            <span class="gophishfree-report-option-desc">Friendly Fish</span>
          </button>
          <button class="gophishfree-report-option medium" data-severity="medium">
            <span class="gophishfree-report-option-fish">\u{1F420}</span>
            <span class="gophishfree-report-option-label">Medium Risk</span>
            <span class="gophishfree-report-option-desc">Suspicious Fish</span>
          </button>
          <button class="gophishfree-report-option high" data-severity="high">
            <span class="gophishfree-report-option-fish">\u{1F421}</span>
            <span class="gophishfree-report-option-label">High Risk</span>
            <span class="gophishfree-report-option-desc">Phishy Pufferfish</span>
          </button>
          <button class="gophishfree-report-option dangerous" data-severity="dangerous">
            <span class="gophishfree-report-option-fish">\u{1F988}</span>
            <span class="gophishfree-report-option-label">Dangerous</span>
            <span class="gophishfree-report-option-desc">Mega Phish Shark</span>
          </button>
        </div>
        <button class="gophishfree-report-cancel">Cancel</button>
      `;

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      requestAnimationFrame(() => overlay.classList.add('show'));

      function cleanup(severity) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
        resolve(severity);
      }

      card.querySelectorAll('.gophishfree-report-option').forEach(btn => {
        btn.addEventListener('click', () => cleanup(btn.dataset.severity));
      });

      card.querySelector('.gophishfree-report-cancel').addEventListener('click', () => cleanup(null));
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(null); });
    });
  }

  /**
   * Process a user-submitted phishing report. Updates the risk badge and side panel
   * to reflect the user-selected severity, saves the report to extension storage,
   * triggers the fish caught animation, and disables the report button.
   * @param {string} severity - The severity level chosen by the user ('low'|'medium'|'high'|'dangerous').
   * @returns {Promise<void>}
   */
  async function handleReport(severity) {
    const mapping = REPORT_SEVERITY[severity];
    if (!mapping || !lastEmailData) return;

    const { riskScore, riskLevel, fishType } = mapping;
    const fishData = { ...FISH_TYPES[fishType], type: fishType };

    updateRiskBadge(riskLevel, riskScore, fishData);

    const scoreEl  = document.getElementById('gophishfree-score');
    const levelEl  = document.getElementById('gophishfree-level');
    const fishEl   = document.getElementById('gophishfree-fish');

    scoreEl.textContent = riskScore;
    scoreEl.className = `gophishfree-score-value ${riskLevel.toLowerCase()}`;
    levelEl.textContent = `${riskLevel} Risk - ${fishData.name} (Reported)`;
    fishEl.textContent = fishData.emoji;

    const reasonsEl = document.getElementById('gophishfree-reasons-list');
    const reportItem = document.createElement('div');
    reportItem.className = 'gophishfree-reason-item';
    reportItem.textContent = `\u{1F6A9} User reported as ${riskLevel} risk`;
    reasonsEl.insertBefore(reportItem, reasonsEl.firstChild);

    lastPrediction = {
      riskScore,
      riskLevel,
      mlProbability: lastPrediction ? lastPrediction.mlProbability : 0,
      reported: true,
      reasons: [`User reported as ${riskLevel} risk`, ...(lastPrediction ? lastPrediction.reasons : [])]
    };
    lastFishData = fishData;

    chrome.runtime.sendMessage({
      action: 'saveScanResult',
      messageId: currentEmailId || `report_${Date.now()}`,
      data: {
        senderDomain: lastEmailData.senderDomain,
        senderDisplayName: lastEmailData.senderDisplayName,
        riskScore,
        riskLevel,
        reasons: lastPrediction.reasons,
        linkCount: (lastEmailData.links || []).length,
        fishType,
        reported: true,
        timestamp: Date.now()
      }
    }, (response) => {
      if (response && response.fishCollection) {
      }
    });

    showFishCaughtAnimation(fishData, riskScore);

    const reportBtn = document.getElementById('gophishfree-report-btn');
    if (reportBtn) {
      reportBtn.disabled = true;
      reportBtn.textContent = '\u2713 Reported';
    }
  }

  // ================================================================
  //  UI Display (Side Panel Population)
  //  Populates the side panel with scan results: risk score, level,
  //  fish emoji, risk indicator reasons, and suspicious links list.
  // ================================================================

  /**
   * Populate the side panel UI with scan results. Updates the score display,
   * risk level label, fish emoji, risk indicator reasons list, and suspicious
   * links list by filtering email links through URL feature extraction.
   * @param {Object} prediction - ML inference result with riskScore, riskLevel, reasons[].
   * @param {Object} emailData - Extracted email data with links[], senderDomain, etc.
   * @param {string} emailId - Unique email identifier.
   * @param {Object} fishData - Fish type data with emoji, name, and description.
   * @returns {void}
   */
  function displayResults(prediction, emailData, emailId, fishData) {
    updateRiskBadge(prediction.riskLevel, prediction.riskScore, fishData);
    
    const scoreEl = document.getElementById('gophishfree-score');
    const levelEl = document.getElementById('gophishfree-level');
    const fishEl = document.getElementById('gophishfree-fish');
    const reasonsEl = document.getElementById('gophishfree-reasons-list');
    const linksEl = document.getElementById('gophishfree-links-list');
    
    scoreEl.textContent = prediction.riskScore;
    scoreEl.className = `gophishfree-score-value ${prediction.riskLevel.toLowerCase()}`;
    levelEl.textContent = `${prediction.riskLevel} Risk - ${fishData.name}`;
    fishEl.textContent = fishData.emoji;
    
    reasonsEl.innerHTML = '';
    if (prediction.reasons.length > 0) {
      prediction.reasons.forEach(reason => {
        const item = document.createElement('div');
        item.className = 'gophishfree-reason-item';
        item.textContent = reason;
        reasonsEl.appendChild(item);
      });
    } else {
      reasonsEl.innerHTML = '<div class="gophishfree-reason-item">\u2705 No significant risk indicators detected</div>';
    }
    
    linksEl.innerHTML = '';
    linksEl.classList.toggle('browserling-enabled', browserlingEnabled);
    const suspiciousLinks = emailData.links.filter(link => {
      const linkFeatures = extractor.extractURLFeatures(link.href);
      return linkFeatures.SuspiciousTLD || linkFeatures.ShortenerDomain || 
             linkFeatures.IpAddress || linkFeatures.NoHttps;
    });
    
    if (suspiciousLinks.length > 0) {
      suspiciousLinks.forEach(link => {
        const item = document.createElement('div');
        item.className = 'gophishfree-link-item suspicious';

        const linkRow = document.createElement('div');
        linkRow.className = 'gophishfree-link-row';

        const anchor = document.createElement('a');
        anchor.href = link.href;
        anchor.target = '_blank';
        anchor.className = 'gophishfree-link-url';
        anchor.textContent = link.href.length > 60 ? link.href.substring(0, 60) + '...' : link.href;
        linkRow.appendChild(anchor);

        const blBtn = document.createElement('a');
        blBtn.href = 'https://www.browserling.com/browse/win10/chrome131/' + encodeURIComponent(link.href);
        blBtn.target = '_blank';
        blBtn.rel = 'noopener noreferrer';
        blBtn.className = 'gophishfree-browserling-btn';
        blBtn.title = 'Preview safely in Browserling';
        blBtn.textContent = '🔍 Browserling';
        linkRow.appendChild(blBtn);

        item.appendChild(linkRow);

        if (link.anchorText && link.anchorText !== link.href) {
          const text = document.createElement('div');
          text.style.marginTop = '4px';
          text.style.fontSize = '11px';
          text.style.color = 'rgba(255, 255, 255, 0.5)';
          text.textContent = `Display text: ${link.anchorText}`;
          item.appendChild(text);
        }
        linksEl.appendChild(item);
      });
    } else {
      linksEl.innerHTML = '<div class="gophishfree-link-item">\u2705 No suspicious links detected</div>';
    }
  }
  
  // ================================================================
  //  Inline Browserling Buttons (Email Body)
  //  Injects/removes small preview buttons next to every link in the
  //  Gmail message body so users can safely open any link via Browserling.
  // ================================================================

  function injectInlineBrowserlingButtons() {
    if (!browserlingEnabled) {
      removeInlineBrowserlingButtons();
      return;
    }

    const bodyContainers = document.querySelectorAll('.ii.gt, [role="list"] .a3s');
    bodyContainers.forEach(container => {
      const anchors = container.querySelectorAll('a[href]:not(.gophishfree-bl-inline)');
      anchors.forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#') || href.includes('mail.google.com')) return;

        const next = anchor.nextElementSibling;
        if (next && next.classList.contains('gophishfree-bl-inline')) return;

        const btn = document.createElement('a');
        btn.href = 'https://www.browserling.com/browse/win10/chrome131/' + encodeURIComponent(href);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.className = 'gophishfree-bl-inline';
        btn.title = 'Preview safely in Browserling';
        btn.textContent = '🔍';

        btn.addEventListener('click', (e) => e.stopPropagation());

        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      });
    });
  }

  function removeInlineBrowserlingButtons() {
    document.querySelectorAll('.gophishfree-bl-inline').forEach(el => el.remove());
  }

  // ================================================================
  //  Badge Management
  //  Controls the risk badge displayed on the Gmail email header.
  //  Handles loading states, deep scan loading, risk level display,
  //  and restoration after scan completion or cancellation.
  // ================================================================

  /**
   * Display a loading spinner badge on the email header while the initial scan
   * is in progress. Removes any existing badge first.
   * @returns {void}
   */
  function showLoadingBadge() {
    const existing = document.getElementById('gophishfree-badge');
    if (existing) existing.remove();

    const headerArea = document.querySelector('[role="main"] h2') ||
                      document.querySelector('.hP') ||
                      document.querySelector('h2');
    if (!headerArea) return;

    const badge = document.createElement('div');
    badge.id = 'gophishfree-badge';
    badge.className = 'gophishfree-risk-badge gophishfree-loading-badge';
    badge.innerHTML = `
      <span class="gophishfree-badge-spinner"></span>
      <span>Scanning...</span>
    `;
    badge.title = 'GoPhishFree is analyzing this email';
    headerArea.parentElement.insertBefore(badge, headerArea.nextSibling);
  }

  /**
   * Remove the loading badge from the email header, but only if it is still
   * in the loading state (prevents removing a results badge).
   * @returns {void}
   */
  function removeLoadingBadge() {
    const badge = document.getElementById('gophishfree-badge');
    if (badge && badge.classList.contains('gophishfree-loading-badge')) {
      badge.remove();
    }
  }

  /**
   * Transition the existing risk badge to a "Deep Scanning..." loading state,
   * replacing the badge content with a spinner and status text.
   * @returns {void}
   */
  function showDeepScanLoadingBadge() {
    const existing = document.getElementById('gophishfree-badge');
    if (!existing) return;

    existing.classList.add('gophishfree-deepscan-loading');
    existing.innerHTML = `
      <span class="gophishfree-badge-spinner"></span>
      <span>Deep Scanning...</span>
    `;
    existing.title = 'Deep scan in progress \u2014 analyzing linked pages';
  }

  /**
   * Restore the risk badge to its previous state (before deep scan loading).
   * Uses cached lastPrediction and lastFishData to rebuild the badge.
   * @returns {void}
   */
  function restorePreviousBadge() {
    if (lastPrediction && lastFishData) {
      updateRiskBadge(lastPrediction.riskLevel, lastPrediction.riskScore, lastFishData);
    } else {
      const badge = document.getElementById('gophishfree-badge');
      if (badge) badge.classList.remove('gophishfree-deepscan-loading');
    }
  }

  /**
   * Create or replace the risk badge on the email header with the final scan result.
   * Displays the fish emoji, name, and risk score. Clicking opens the side panel.
   * @param {string} riskLevel - Risk level string ('Low'|'Medium'|'High'|'Dangerous').
   * @param {number} riskScore - Final risk score (0-100).
   * @param {Object} fishData - Fish type data with emoji, name, and description.
   * @returns {void}
   */
  function updateRiskBadge(riskLevel, riskScore, fishData) {
    const existingBadge = document.getElementById('gophishfree-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    const headerArea = document.querySelector('[role="main"] h2') ||
                      document.querySelector('.hP') ||
                      document.querySelector('h2');
    
    if (headerArea) {
      const badge = document.createElement('div');
      badge.id = 'gophishfree-badge';
      
      let badgeClass = riskLevel.toLowerCase();
      if (riskScore >= 90) badgeClass = 'dangerous';
      
      badge.className = `gophishfree-risk-badge ${badgeClass}`;

      badge.innerHTML = `
        <span class="gophishfree-fish-icon">${fishData.emoji}</span>
        <span>${fishData.name} (${riskScore})</span>
      `;
      badge.title = `${fishData.name} - Click for details`;
      badge.addEventListener('click', () => openSidePanel());
      
      headerArea.parentElement.insertBefore(badge, headerArea.nextSibling);
    }
  }
  
  /**
   * Open the analysis side panel by adding the 'open' class and showing the overlay.
   * @returns {void}
   */
  function openSidePanel() {
    document.getElementById('gophishfree-sidepanel').classList.add('open');
    document.getElementById('gophishfree-overlay').classList.add('show');
  }
  
  /**
   * Close the analysis side panel by removing the 'open' class and hiding the overlay.
   * @returns {void}
   */
  function closeSidePanel() {
    document.getElementById('gophishfree-sidepanel').classList.remove('open');
    document.getElementById('gophishfree-overlay').classList.remove('show');
  }
  
})();
