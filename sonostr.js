const { Relay, RelayPool, signId, calculateId, getPublicKey } = require('nostr')
const { bech32 } = require('bech32')    
const { Sonos, DeviceDiscovery } = require('sonos')
const buffer = require('buffer')

require('dotenv').config();

(async () => {
  try {
  
    const pubkey = getPublicKey(process.env.PRIVATE_KEY)
    const npub = pubkeytonpub(pubkey)

    var relayPool = null
    
    console.log(`Welcome to SonoStr`)
    
    const filter = { kinds: [0, 10002], authors: [pubkey] }
  
    const relay = Relay('wss://purplepag.es', {reconnect: false})
    relay.on('open', async () => {
      await relay.send(['REQ', 'req-1', filter])
    })

    relay.on('event', (subscriptionId, event) => {
      if (event.kind == 0) {
        const metadata = JSON.parse(event.content)
        console.log(`Hello ${metadata.name}`)
      }
      if (event.kind == 10002) {
        var relays = event.tags.filter(t => t[0] == 'r').filter(t => t.length == 2 || t[2] == 'write').map(t => t[1])
        console.log(`Posting on ${relays.length} relays`)

        createRelayPool(relays)
      }
    })
    relay.on('error', (error) => {
      // console.log(`Error ${relay.url}: ${error}`)
    });
    relay.on('notice', (relay, notice) => {
      // console.log(`Notice ${relay.url}: ${notice}`)
    });
    relay.on('eose', (eose) => {
      relay.close()
    });

    var expiration = 0
    var duration = 0
    var content = null

    DeviceDiscovery().once('DeviceAvailable', (device) => {
  
      console.log(`Connected to Sonos network`)

      device.getAllGroups().then(groups => {
        groups.forEach(group => {
          if (group.Name == process.env.SONOS_GROUP) {
            console.log(`Listening on Sonos group ${group.Name}`)
  
            const sonos = new Sonos(group.host)
            sonos.on('CurrentTrack', track => {
              if (track.title != null && track.title.startsWith('ZPSTR_')) return

              var previousContent = content;
              content = track.artist ? `${track.artist} - ${track.title}` : track.title

              // Radio Paradise intermission track
              if (content === 'Commercial-free - Listener-supported') return

              if (previousContent != content) {
                console.log(`Now playing: ${content}`)
                expiration = 0
                duration = track.duration || 120
              }
            })
          }
        })
      })
    }) 

    setInterval(async () => {
      const currentTime = unixTimestampSec()
      if (expiration <= currentTime && relayPool != null && content != null) {
        expiration = currentTime + duration
        const event = {
          created_at: currentTime,
          pubkey: pubkey,
          kind: 30315,
          content: content,
          tags: [['d', 'music'], ['expiration', expiration.toString()]]
        }

        event.id = await calculateId(event)
        event.sig = await signId(process.env.PRIVATE_KEY, event.id)

        relayPool.send(["EVENT", event])
      }
    }, 1000);

    function createRelayPool(relays) {
      relayPool = RelayPool(relays, {reconnect: true})
      relayPool.on('error', (e) => {
        // console.log(`Error ${relay.url}: ${e.message}`)
      });
      relayPool.on('notice', (relay, notice) => {
        console.log(`Notice ${relay.url}: ${JSON.stringify(notice)}`)
      });
    }

  } catch (error) {
    console.log(error)  
  }
})();

function unixTimestampSec() {
  return Math.floor(new Date().getTime() / 1000)
}

function pubkeytonpub(pubkey) {
  let words = bech32.toWords( buffer.Buffer.from( pubkey, 'hex' ) );
  return bech32.encode( "npub", words );
}  

