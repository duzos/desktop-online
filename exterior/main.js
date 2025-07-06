async function CreateMcMeta() {
    return JSON.stringify({
        "pack": {
            "pack_format": 15,
            "description": "made with duzos ait generator"
        }
    }, null, 2);  // Format with 2 spaces for readability
}
async function CreateExteriorJson(namespace, id, parent, category, hasEmission = false) {
    return JSON.stringify({
        "watermark": "made with duzos ait generator",
        "id": namespace + ":" + id,
        "parent": parent,
        "category": category,
        "texture": `${namespace}:textures/exterior/${id}.png`,
        ...(hasEmission && { "emission": `${namespace}:textures/exterior/${id}_emission.png` }),
    }, null, 2);
}

async function CreateLanguageJson(namespace, id, name) {
    const path = `exterior.${namespace}.${id}`;

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
    let parent = document.getElementById('parent').value;
    const texture = document.getElementById('texture').files[0];

    const emission = document.getElementById('emission').files[0];
    let name = document.getElementById('langName').value;
    let ownCategory = document.getElementById('category').value;
    let ownParent = document.getElementById('otherParent').value;

    if (!namespace || !id || !parent || !texture) {
        alert("Please fill in all fields.");
        return;
    }

    if (!name) {
        name = formatAndCapitalize(id);
    }

    let category = ownCategory;
    if (!category) {
        let prefix = parent.split("/")[0]
        category = "ait:exterior/" + prefix;
    }

    if (!ownParent) {
        parent = "ait:exterior/" + parent;
    } else {
        parent = ownParent;
    }

    // Create a new JSZip instance
    const meta = await CreateMcMeta();

    const zip = new JSZip();

    const datapack = new JSZip();

    datapack.file(`pack.mcmeta`, meta);
    datapack.file(`data/${namespace}/exterior/${id}.json`, await CreateExteriorJson(namespace, id, parent, category, emission !== null));

    zip.file(`${namespace}_${id}_data_pack.zip`, await datapack.generateAsync({ type: "blob"}));

    const resourcepack = new JSZip();
    resourcepack.file(`assets/${namespace}/textures/exterior/${id}.png`, texture);

    if (emission) {
        resourcepack.file(`assets/${namespace}/textures/exterior/${id}_emission.png`, emission);
    }

    resourcepack.file(`pack.mcmeta`, meta);
    resourcepack.file(`assets/${namespace}/lang/en_us.json`, await CreateLanguageJson(namespace, id, name))

    zip.file(`${namespace}_${id}_resource_pack.zip`, await resourcepack.generateAsync({ type: "blob"}));

    // Generate the zip and initiate download
    saveAs(await zip.generateAsync({ type: "blob" }), `${namespace}_${id}_pack.zip`);
}
