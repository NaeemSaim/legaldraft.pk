// ---------------------------------------------------------------------------
// Disposable / temporary email blocklist.
//
// These are the domains behind throwaway inboxes (10-minute mail and similar).
// Blocking them stops people harvesting free trial credits over and over with
// a new address each time.
//
// This list covers the common services. New ones appear constantly, so the
// signup check also verifies that the domain can actually receive mail (an MX
// record lookup) — that catches most of what a static list misses.
// ---------------------------------------------------------------------------

const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com', '10mail.org', '10minutemail.com', '10minutemail.net', '20minutemail.com',
  '33mail.com', '3dmail.top', 'anonaddy.com', 'anonbox.net', 'armyspy.com',
  'bccto.me', 'burnermail.io', 'byom.de', 'cock.li', 'crazymailing.com',
  'dea-link.eu', 'discard.email', 'discardmail.com', 'disposable.com', 'disposableinbox.com',
  'dispostable.com', 'dodgeit.com', 'dropmail.me', 'duck.com', 'e4ward.com',
  'email-fake.com', 'emailfake.com', 'emailondeck.com', 'emailtemporanea.com', 'emailtemporario.com.br',
  'emltmp.com', 'ephemail.net', 'fakeinbox.com', 'fakemail.net', 'fakemailgenerator.com',
  'fastmazda.com', 'filzmail.com', 'forgetmail.com', 'gettempmail.com', 'getairmail.com',
  'getnada.com', 'grr.la', 'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de',
  'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'harakirimail.com', 'inboxalias.com', 'inboxbear.com', 'inboxkitten.com', 'incognitomail.com',
  'jetable.org', 'kasmail.com', 'killmail.com', 'linshiyouxiang.net', 'luxusmail.org',
  'mail-temporaire.fr', 'mail.tm', 'mail7.io', 'mailcatch.com', 'maildrop.cc',
  'mailduck.io', 'maileater.com', 'mailexpire.com', 'mailforspam.com', 'mailgutter.com',
  'mailinater.com', 'mailinator.com', 'mailinator.net', 'mailmetrash.com', 'mailnesia.com',
  'mailnull.com', 'mailpoof.com', 'mailsac.com', 'mailtemp.info', 'mailtothis.com',
  'meltmail.com', 'minuteinbox.com', 'moakt.com', 'mohmal.com', 'msgsafe.io',
  'mt2015.com', 'mytemp.email', 'mytrashmail.com', 'nowmymail.com', 'nada.email',
  'notmailinator.com', 'objectmail.com', 'odaymail.com', 'onetimemail.org', 'owlymail.com',
  'pokemail.net', 'proxymail.eu', 'rcpt.at', 'reallymymail.com', 'rtrtr.com',
  'safetymail.info', 'sharklasers.com', 'shitmail.me', 'sneakemail.com', 'spam4.me',
  'spamavert.com', 'spambog.com', 'spambox.us', 'spamdecoy.net', 'spamfree24.org',
  'spamgourmet.com', 'spamherelots.com', 'spaml.com', 'spamspot.com', 'tempail.com',
  'tempemail.co', 'tempemail.net', 'tempinbox.com', 'tempm.com', 'tempmail.altmails.com',
  'tempmail.de', 'tempmail.dev', 'tempmail.email', 'tempmail.ninja', 'tempmail.plus',
  'tempmail.us', 'tempmailer.com', 'tempmailo.com', 'tempomail.fr', 'temp-mail.io',
  'temp-mail.org', 'temp-mail.ru', 'tempr.email', 'throwawaymail.com', 'tmail.ws',
  'tmails.net', 'tmpmail.net', 'tmpmail.org', 'trashmail.com', 'trashmail.de',
  'trashmail.me', 'trashmail.net', 'trbvm.com', 'trialmail.de', 'vomoto.com',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'yopmail.com', 'yopmail.fr',
  'yopmail.net', 'zetmail.com', 'mailmoat.com', 'inbox.si', 'onemail.host',
])

// Substrings that almost always indicate a throwaway service, so lookalike
// domains ("temp-mail-xyz.com") are caught too.
const SUSPICIOUS_PATTERNS = [
  'tempmail', 'temp-mail', 'throwaway', 'trashmail', 'guerrillamail',
  'mailinator', 'yopmail', 'fakemail', 'fake-mail', '10minute', 'minutemail',
  'disposable', 'dispose', 'burnermail', 'getnada', 'sharklasers',
]

function isDisposableDomain(domain) {
  const d = String(domain || '').toLowerCase().trim()
  if (!d) return true
  if (DISPOSABLE_DOMAINS.has(d)) return true
  return SUSPICIOUS_PATTERNS.some((p) => d.includes(p))
}

module.exports = { DISPOSABLE_DOMAINS, isDisposableDomain }