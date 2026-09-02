
async function testUrl(name: string, url: string) {
    try {
        const res = await fetch(url, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
        })
        console.log(`${name}: ${res.status} ${res.statusText} (Type: ${res.headers.get('content-type')})`)
    } catch (e: any) {
        console.log(`${name}: Error ${e.message}`)
    }
}

async function main() {
    await testUrl('LoremFlickr', 'https://loremflickr.com/800/600/kotabunan,news')
    await testUrl('Picsum', 'https://picsum.photos/800/600')
}

main()
