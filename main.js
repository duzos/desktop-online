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

async function createZip() {
    const namespace = document.getElementById('namespace').value;
    const id = document.getElementById('id').value;
    var pngFileInput = document.getElementById('pngFile').files[0];
    const nbtFile = document.getElementById('nbtFile').files[0];

    if (!namespace || !id || !nbtFile) {
        alert("Please fill in all fields and select both files.");
        return;
    }

    if (!pngFileInput) {
        // If no PNG was uploaded, fetch the default icon and add it
        const defaultIconResponse = await fetch('assets/icon.png');
        pngFileInput = await defaultIconResponse.blob();
    }

    // Create a new JSZip instance
    const zip = new JSZip();

    zip.file(`resourcepack/assets/${namespace}/textures/desktop/${id}.png`, pngFileInput);
    zip.file(`datapack/data/${namespace}/structures/interiors/${id}.nbt`, nbtFile);

    const meta = await CreateMcMeta();
    zip.file(`resourcepack/pack.mcmeta`, meta);
    zip.file(`datapack/pack.mcmeta`, meta);

    zip.file(`datapack/data/${namespace}/desktop/${id}.json`, await CreateDesktopJson());

    // Generate the zip and initiate download
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${namespace}_${id}_pack.zip`);
}