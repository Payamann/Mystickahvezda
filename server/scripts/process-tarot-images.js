
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, '../../temp_new_tarot');
const TARGET_DIR = path.join(__dirname, '../../img/tarot');

const USER_MAPPING = [
    {
        "original": "Gemini_Generated_Image_15ik3915ik3915ik – upraveno.png",
        "cardName": "Vůz",
        "targetFilename": "tarot_vuz.webp"
    },
    {
        "original": "Gemini_Generated_Image_17oa6q17oa6q17oa – upraveno.png",
        "cardName": "Čtyřka disků",
        "targetFilename": "tarot_ctyrka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_2yhnzl2yhnzl2yhn – upraveno – upraveno (1).png",
        "cardName": "Trojka mečů",
        "targetFilename": "tarot_trojka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_2yhnzl2yhnzl2yhn – upraveno – upraveno.png",
        "cardName": "Trojka mečů",
        "targetFilename": "tarot_trojka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_3rgolh3rgolh3rgo – upraveno.png",
        "cardName": "Pětka disků",
        "targetFilename": "tarot_petka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_3yhzqz3yhzqz3yhz – upraveno.png",
        "cardName": "Čtyřka holí",
        "targetFilename": "tarot_ctyrka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_44ch1r44ch1r44ch – upraveno.png",
        "cardName": "Pětka mečů",
        "targetFilename": "tarot_petka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_44idzf44idzf44id – upraveno.png",
        "cardName": "Eso disků",
        "targetFilename": "tarot_eso_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_4w32w4w32w4w32w4 – upraveno.png",
        "cardName": "Sedmička mečů",
        "targetFilename": "tarot_sedmicka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_57fwrp57fwrp57fw – upraveno.png",
        "cardName": "Páže disků",
        "targetFilename": "tarot_paze_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_6b0r1z6b0r1z6b0r – upraveno.png",
        "cardName": "Pětka pohárů",
        "targetFilename": "tarot_petka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_6lzjyh6lzjyh6lzj – upraveno.png",
        "cardName": "Královna holí",
        "targetFilename": "tarot_kralovna_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_7kl4cm7kl4cm7kl4 – upraveno.png",
        "cardName": "Šestka holí",
        "targetFilename": "tarot_sestka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_7lmt3q7lmt3q7lmt – upraveno.png",
        "cardName": "Kolo štěstí",
        "targetFilename": "tarot_kolo_stesti.webp"
    },
    {
        "original": "Gemini_Generated_Image_7o4i4l7o4i4l7o4i – upraveno.png",
        "cardName": "Král disků",
        "targetFilename": "tarot_kral_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_8ubji38ubji38ubj – upraveno.png",
        "cardName": "Velekněz",
        "targetFilename": "tarot_veleknez.webp"
    },
    {
        "original": "Gemini_Generated_Image_8xxbl78xxbl78xxb – upraveno.png",
        "cardName": "Devítka holí",
        "targetFilename": "tarot_devitka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_914zna914zna914z – upraveno.png",
        "cardName": "Desítka holí",
        "targetFilename": "tarot_desitka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_9bz9h29bz9h29bz9 – upraveno.png",
        "cardName": "Trojka disků",
        "targetFilename": "tarot_trojka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_9dj32z9dj32z9dj3 – upraveno.png",
        "cardName": "Šestka pohárů",
        "targetFilename": "tarot_sestka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_9thbf19thbf19thb – upraveno.png",
        "cardName": "Devítka mečů",
        "targetFilename": "tarot_devitka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_afjgmxafjgmxafjg – upraveno.png",
        "cardName": "Rytíř pohárů",
        "targetFilename": "tarot_rytir_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_b1bfo4b1bfo4b1bf – upraveno.png",
        "cardName": "Královna disků",
        "targetFilename": "tarot_kralovna_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_b96lxub96lxub96l – upraveno.png",
        "cardName": "Dvojka holí",
        "targetFilename": "tarot_dvojka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_biesrqbiesrqbies – upraveno.png",
        "cardName": "Desítka mečů",
        "targetFilename": "tarot_desitka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_d1vkgod1vkgod1vk – upraveno.png",
        "cardName": "Osmička holí",
        "targetFilename": "tarot_osmicka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_d2syu1d2syu1d2sy – upraveno.png",
        "cardName": "Dvojka pohárů",
        "targetFilename": "tarot_dvojka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_dhpc8ydhpc8ydhpc – upraveno.png",
        "cardName": "Sedmička pohárů",
        "targetFilename": "tarot_sedmicka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_dm7ipwdm7ipwdm7i – upraveno.png",
        "cardName": "Páže mečů",
        "targetFilename": "tarot_paze_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_e5uu1xe5uu1xe5uu – upraveno.png",
        "cardName": "Sedmička holí",
        "targetFilename": "tarot_sedmicka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_eiwdpqeiwdpqeiwd – upraveno.png",
        "cardName": "Osmička disků",
        "targetFilename": "tarot_osmicka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_ek7ev2ek7ev2ek7e – upraveno.png",
        "cardName": "Dvojka mečů",
        "targetFilename": "tarot_dvojka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_ekj5qekj5qekj5qe – upraveno.png",
        "cardName": "Milenci",
        "targetFilename": "tarot_milenci.webp"
    },
    {
        "original": "Gemini_Generated_Image_fm9x2cfm9x2cfm9x – upraveno.png",
        "cardName": "Síla",
        "targetFilename": "tarot_sila.webp"
    },
    {
        "original": "Gemini_Generated_Image_fz7x8ufz7x8ufz7x – upraveno.png",
        "cardName": "Čtyřka mečů",
        "targetFilename": "tarot_ctyrka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_gma19pgma19pgma1 – upraveno.png",
        "cardName": "Král mečů",
        "targetFilename": "tarot_kral_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_h5re8dh5re8dh5re – upraveno.png",
        "cardName": "Rytíř mečů",
        "targetFilename": "tarot_rytir_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_hae5gvhae5gvhae5 – upraveno.png",
        "cardName": "Rytíř disků",
        "targetFilename": "tarot_rytir_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_hjikqrhjikqrhjik – upraveno.png",
        "cardName": "Pětka mečů",
        "targetFilename": "tarot_petka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_hqeogphqeogphqeo – upraveno.png",
        "cardName": "Královna mečů",
        "targetFilename": "tarot_kralovna_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_huewe2huewe2huew – upraveno.png",
        "cardName": "Desítka pohárů",
        "targetFilename": "tarot_desitka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_j1ubhhj1ubhhj1ub – upraveno.png",
        "cardName": "Osmička mečů",
        "targetFilename": "tarot_osmicka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_jqe5cqjqe5cqjqe5 – upraveno.png",
        "cardName": "Luna",
        "targetFilename": "tarot_luna.webp"
    },
    {
        "original": "Gemini_Generated_Image_k4nhl1k4nhl1k4nh – upraveno.png",
        "cardName": "Slunce",
        "targetFilename": "tarot_slunce.webp"
    },
    {
        "original": "Gemini_Generated_Image_kajg21kajg21kajg – upraveno.png",
        "cardName": "Trojka holí",
        "targetFilename": "tarot_trojka_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_kcor34kcor34kcor – upraveno.png",
        "cardName": "Viselec",
        "targetFilename": "tarot_viselec.webp"
    },
    {
        "original": "Gemini_Generated_Image_lidg1qlidg1qlidg – upraveno.png",
        "cardName": "Svět",
        "targetFilename": "tarot_svet.webp"
    },
    {
        "original": "Gemini_Generated_Image_lkii2blkii2blkii – upraveno.png",
        "cardName": "Mág",
        "targetFilename": "tarot_mag.webp"
    },
    {
        "original": "Gemini_Generated_Image_lm2mjwlm2mjwlm2m – upraveno.png",
        "cardName": "Poustevník",
        "targetFilename": "tarot_poustevnik.webp"
    },
    {
        "original": "Gemini_Generated_Image_lnqreelnqreelnqr – upraveno.png",
        "cardName": "Císař",
        "targetFilename": "tarot_cisar.webp"
    },
    {
        "original": "Gemini_Generated_Image_mf7fm1mf7fm1mf7f – upraveno.png",
        "cardName": "Osmička pohárů",
        "targetFilename": "tarot_osmicka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_mm3kjqmm3kjqmm3k – upraveno.png",
        "cardName": "Dvojka mečů",
        "targetFilename": "tarot_dvojka_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_n2x5abn2x5abn2x5 – upraveno.png",
        "cardName": "Rytíř holí",
        "targetFilename": "tarot_rytir_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_n3bgwjn3bgwjn3bg – upraveno.png",
        "cardName": "Věž",
        "targetFilename": "tarot_vez.webp"
    },
    {
        "original": "Gemini_Generated_Image_nqmxqmnqmxqmnqmx – upraveno.png",
        "cardName": "Blázen",
        "targetFilename": "tarot_blazen.webp"
    },
    {
        "original": "Gemini_Generated_Image_owbwoyowbwoyowbw – upraveno.png",
        "cardName": "Devítka pohárů",
        "targetFilename": "tarot_devitka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_pv5zxxpv5zxxpv5z – upraveno.png",
        "cardName": "Páže pohárů",
        "targetFilename": "tarot_paze_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_r1357jr1357jr135 – upraveno.png",
        "cardName": "Spravedlnost",
        "targetFilename": "tarot_spravedlnost.webp"
    },
    {
        "original": "Gemini_Generated_Image_rpnjpurpnjpurpnj – upraveno.png",
        "cardName": "Mírnost",
        "targetFilename": "tarot_mirnost.webp"
    },
    {
        "original": "Gemini_Generated_Image_s28o9zs28o9zs28o – upraveno.png",
        "cardName": "Eso mečů",
        "targetFilename": "tarot_eso_mecu.webp"
    },
    {
        "original": "Gemini_Generated_Image_shcttshcttshctts – upraveno.png",
        "cardName": "Devítka disků",
        "targetFilename": "tarot_devitka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_t6t4ght6t4ght6t4 – upraveno.png",
        "cardName": "Soud",
        "targetFilename": "tarot_soud.webp"
    },
    {
        "original": "Gemini_Generated_Image_tdewrktdewrktdew – upraveno.png",
        "cardName": "Čtyřka pohárů",
        "targetFilename": "tarot_ctyrka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_ubrzraubrzraubrz – upraveno.png",
        "cardName": "Hvězda",
        "targetFilename": "tarot_hvezda.webp"
    },
    {
        "original": "Gemini_Generated_Image_uimzhnuimzhnuimz – upraveno.png",
        "cardName": "Desítka disků",
        "targetFilename": "tarot_desitka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_v6r4a1v6r4a1v6r4 – upraveno.png",
        "cardName": "Smrt",
        "targetFilename": "tarot_smrt.webp"
    },
    {
        "original": "Gemini_Generated_Image_w354few354few354 – upraveno.png",
        "cardName": "Sedmička disků",
        "targetFilename": "tarot_sedmicka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_w7gp0iw7gp0iw7gp – upraveno.png",
        "cardName": "Král pohárů",
        "targetFilename": "tarot_kral_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_wfzetrwfzetrwfze – upraveno.png",
        "cardName": "Král holí",
        "targetFilename": "tarot_kral_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_wkbfmywkbfmywkbf – upraveno.png",
        "cardName": "Šestka disků",
        "targetFilename": "tarot_sestka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_x2j4lqx2j4lqx2j4 – upraveno.png",
        "cardName": "Pětka disků",
        "targetFilename": "tarot_petka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_xo9wd3xo9wd3xo9w – upraveno.png",
        "cardName": "Eso holí",
        "targetFilename": "tarot_eso_holi.webp"
    },
    {
        "original": "Gemini_Generated_Image_xqbpb6xqbpb6xqbp – upraveno.png",
        "cardName": "Ďábel",
        "targetFilename": "tarot_dabel.webp"
    },
    {
        "original": "Gemini_Generated_Image_xw9iq3xw9iq3xw9i – upraveno.png",
        "cardName": "Dvojka disků",
        "targetFilename": "tarot_dvojka_disku.webp"
    },
    {
        "original": "Gemini_Generated_Image_yv9sjyv9sjyv9sjy – upraveno.png",
        "cardName": "Královna pohárů",
        "targetFilename": "tarot_kralovna_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_z7afixz7afixz7af – upraveno.png",
        "cardName": "Trojka pohárů",
        "targetFilename": "tarot_trojka_poharu.webp"
    },
    {
        "original": "Gemini_Generated_Image_zek4b2zek4b2zek4 – upraveno.png",
        "cardName": "Páže holí",
        "targetFilename": "tarot_paze_holi.webp"
    },
    {
        "original": "Veleknezka.png",
        "cardName": "Velekněžka",
        "targetFilename": "tarot_veleknezka.webp"
    }
];

const processedCards = new Set();
let processedFiles = 0;

async function processImages() {
    console.log(`Starting processing of ${USER_MAPPING.length} items...`);

    // Create target dir if not exists (should exist)
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Backup Dir (optional, for safety)
    const backupDir = path.join(TARGET_DIR, 'backup_old');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    for (const item of USER_MAPPING) {
        let { original, cardName, targetFilename } = item;

        // 1. Rename logic: Disky -> Pentákly
        targetFilename = targetFilename.replace(/_disku/g, '_pentaklu');

        // 2. Deduplication logic: If we already processed this target filename, skip
        if (processedCards.has(targetFilename)) {
            console.warn(`[SKIP] Duplicate target found: ${targetFilename} (Original: ${original})`);
            continue;
        }

        // 3. Process
        const sourcePath = path.join(SOURCE_DIR, original);
        const targetPath = path.join(TARGET_DIR, targetFilename);

        // Check if source exists
        if (!fs.existsSync(sourcePath)) {
            // Try formatting checks (maybe some encoding issues or spaces)
            console.error(`[ERROR] Source file not found: ${sourcePath}`);
            continue;
        }

        // Backup existing file if exists
        if (fs.existsSync(targetPath)) {
            const backupPath = path.join(backupDir, targetFilename);
            try {
                fs.copyFileSync(targetPath, backupPath);
            } catch (e) { console.error('Backup failed', e); }
        }

        try {
            await sharp(sourcePath)
                .webp({ quality: 85 }) // Convert to WebP with good quality
                .resize({ width: 600, fit: 'inside', withoutEnlargement: true }) // Optimize size if needed, keep aspect ratio
                .toFile(targetPath);

            console.log(`[OK] ${original} -> ${targetFilename}`);
            processedCards.add(targetFilename);
            processedFiles++;
        } catch (error) {
            console.error(`[FAIL] Could not process ${original}:`, error);
        }
    }

    console.log(`\n🎉 Processing Complete!`);
    console.log(`Processed: ${processedFiles} images.`);
    console.log(`Unique Cards: ${processedCards.size}`);
}

processImages().catch(err => console.error(err));
