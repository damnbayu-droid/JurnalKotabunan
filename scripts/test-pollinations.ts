
async function testUrl(name: string, url: string) {
    try {
        const res = await fetch(url, { method: 'HEAD' })
        console.log(`${name}: ${res.status} ${res.statusText}`)
    } catch (e: any) {
        console.log(`${name}: Error ${e.message}`)
    }
}

async function main() {
    const prompt = 'Kotabunan News Test'
    const encoded = encodeURIComponent(prompt)

    await testUrl('Base', `https://image.pollinations.ai/prompt/${encoded}`)
    await testUrl('NoLogo', `https://image.pollinations.ai/prompt/${encoded}?nologo=true`)
    await testUrl('Private', `https://image.pollinations.ai/prompt/${encoded}?private=true`)
    await testUrl('NoLogo+Private', `https://image.pollinations.ai/prompt/${encoded}?nologo=true&private=true`)
    await testUrl('WidthHeight', `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720`)
}

main()
