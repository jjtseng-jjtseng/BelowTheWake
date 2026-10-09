"""Correct the downloaded tentacle's optional skeleton root metadata only.
Mesh, materials, joint transforms, skin weights and all animation data stay intact.
"""
from pathlib import Path
import json, struct

base = Path(__file__).resolve().parent
original = base / 'sea-tentacle-original.glb'
destination = base.parent / 'public/models/sea-tentacle.glb'
data = original.read_bytes()
size, kind = struct.unpack_from('<II', data, 12)
assert kind == 0x4E4F534A
gltf = json.loads(data[20:20 + size])
parents = {child: i for i, node in enumerate(gltf['nodes']) for child in node.get('children', [])}
for skin in gltf['skins']:
    chains = []
    for joint in skin['joints']:
        chain = [joint]
        while chain[-1] in parents:
            chain.append(parents[chain[-1]])
        chains.append(chain)
    root = next(node for node in chains[0] if all(node in chain for chain in chains))
    skin['skeleton'] = root
    print('Correct common skeleton root:', root)
encoded = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
encoded += b' ' * (-len(encoded) % 4)
remaining = data[20 + size:]
length = 20 + len(encoded) + len(remaining)
destination.write_bytes(struct.pack('<4sII', b'glTF', 2, length) +
                        struct.pack('<II', len(encoded), kind) + encoded + remaining)
