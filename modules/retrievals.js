const url = require('url');
const express = require('express');
const fs = require('node:fs');

const router = express.Router();
router.use(express.json());
router.get('/departements',async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    var token = parsedUrl.query.token;
    if(token)// 1-token and is 2-matching
    {
        try
        {
            var documentPrefix = parsedUrl.pathname.replace("/",'');
            //console.log(documentPrefix);
            const data = fs.readFileSync(`Data/${documentPrefix}.json`);
            console.log(JSON.parse(data));
            res.status(200).json(JSON.parse(data));
            return;
        }
        catch(err)
        {
            res.status(500).json({message:"erreure de configuration côté serveur",err});
        }
    }
    else
    {
        res.status(500).json({message:"No valid token given."});
    }
});

module.exports = router;