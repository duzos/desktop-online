async function CreateMcMeta() {
    return JSON.stringify({
        "pack": {
            "pack_format": 15,
            "description": "made with duzos desktop generator"
        }
    }, null, 2);  // Format with 2 spaces for readability
}
async function CreateDesktopJson(namespace, id) {
    return JSON.stringify({
        "watermark": "made with duzos desktop generator",
        "id": namespace + ":" + id
    }, null, 2);
}
async function CreateLanguageJson(namespace, id, name) {
    const path = `desktop.${namespace}.${id}`;

    return JSON.stringify({
        [path]: name
    }, null, 2);
}
function formatAndCapitalize(input) {
    return input
        .split('_')
        .map(word => 
            word.charAt(0).toUpperCase() + word.slice(1) 
        )
        .join(' ');
}


async function createZip() {
    const namespace = document.getElementById('namespace').value;
    const id = document.getElementById('id').value;
    var pngFileInput = document.getElementById('pngFile').files[0];
    const nbtFile = document.getElementById('nbtFile').files[0];
    var name = document.getElementById('langName').value;

    if (!namespace || !id || !nbtFile) {
        alert("Please fill in all fields and select both files.");
        return;
    }

    if (!pngFileInput) {
        // If no PNG was uploaded, fetch the default icon and add it
        const defaultIconResponse = await fetch('assets/icon.png');
        pngFileInput = await defaultIconResponse.blob();
    }

    if (!name) {
        name = formatAndCapitalize(id);
    }

    // Create a new JSZip instance
    const meta = await CreateMcMeta();

    const zip = new JSZip();

    const datapack = new JSZip();

    datapack.file(`data/${namespace}/structures/interiors/${id}.nbt`, nbtFile);
    datapack.file(`pack.mcmeta`, meta);
    datapack.file(`data/${namespace}/desktop/${id}.json`, await CreateDesktopJson(namespace, id));

    zip.file(`${namespace}_${id}_data_pack.zip`, await datapack.generateAsync({ type: "blob"}));

    const resourcepack = new JSZip();
    resourcepack.file(`assets/${namespace}/textures/desktop/${id}.png`, pngFileInput);
    resourcepack.file(`pack.mcmeta`, meta);
    resourcepack.file(`assets/${namespace}/lang/en_us.json`, await CreateLanguageJson(namespace, id, name))

    zip.file(`${namespace}_${id}_resource_pack.zip`, await resourcepack.generateAsync({ type: "blob"}));

    // Generate the zip and initiate download
    saveAs(await zip.generateAsync({ type: "blob" }), `${namespace}_${id}_pack.zip`);
}
