# SonoStr

Posting Sonos music to Nostr as User Status (NIP-315)

# usage

Install dependencies: `npm install`.

Set configuration by copying `.env.example` to `.env` and fill in the fields.

Run: `node sonostr.js`.

# what does it do

It tries to connect to your Sonos system on your LAN, find the room you want to use for music status source. It also connects to the [Purplepag.es](https://purplepag.es) relay to find your write relays and your metadata. When this succeeds, it will post a `kind:30315` event with the song name and artist. This will show up on your profile in certain Nostr clients.

# known issues

It only tries to connect to the Sonos network once. If you have this running on a machine and it loses the connection to the Sonos network, the program probably dies and needs to be restarted.

Some streams don't supply a duration for a song. In this case it reposts the status after 120 seconds, or when a new song is started.

# further reading

The User Statusses implementation is based on [jb55's NIP-315](https://github.com/jb55/nips/blob/user-statuses/315.md).
