const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Upload file ke Catbox (binary)
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function uploadCatbox(filePath) {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const res = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
    });

    if (!res.data.startsWith("https://"))
        throw new Error("Gagal upload ke Catbox");

    return res.data;
}

module.exports = { uploadCatbox };