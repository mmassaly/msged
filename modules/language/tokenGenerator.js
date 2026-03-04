const fs = require('fs');

const french_letters= [
  "A","B","C","D","E","F","G","H","I","J","K","L",
  "M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
  "À","Â","Ä",
  "É","È","Ê","Ë",
  "Î","Ï",
  "Ô","Ö",
  "Ù","Û","Ü",
  "Ç","Ÿ","Z"
];
const shortSequence = ["a","b","c"];
const shortSequenceMaxLength = 4;
const max_length = 38;

const outterObj = {};
const pickyFunctionBool = false; 
const generator_function = (base,max_length_param,quota,quotaIndex)=>{
    let storageArray = [];
    if(pickyFunctionBool)
        console.log(pickyFunction(max_length_param,base,[],quota,quotaIndex,storageArray));
    else
    {
        for(let i = 1; i <= 14; ++i )
        {
            generator_Function_loop_based(i,french_letters,storageArray,9000);
            console.log(storageArray);
        }
    }
    storageArray.forEach((each,index)=>{
        let model = `{
            "mot": "Amour",
            "sens": "Sentiment d’affection profonde",
            "famille": "Nom",
            "but": "Exprimer l’attachement et la tendresse",
            "notation": "Positive",
            "synonymes": ["affection", "tendresse", "passion"],
            "mots_associes": ["aimer", "amoureux", "amical"]
        }`;
        let prompt =`system:ton role est d'identifier l'appartenance des mots recus
            a la langue française Utilises ce modèle de dictionnaire ${model}
            pour me rendre la signification des mots. user:
            renvoies un dictionnaire des mots suivants si ils font parti de la langue française. Si tu trouves un par mis eux renseigne son modèle sinon ne renseignes pas ensuite 
            tu mets les mots retrouvés dans un object aux clées définies par les mots eux memes.Je n'ai pas besoin de chats.`;
        try
        {
            if( !fs.existsSync("./copilot"))
            {
                fs.mkdirSync("./copilot");
            }
            fs.writeFileSync("./copilot/text"+(1+index)+".txt",prompt+"\n"+JSON.stringify(each.stack));
        }
        catch(err)
        {
            console.log(err);
        }
    });
};
const generator_Function_loop_based = (max,givenArray,storageArray,quota)=>{
    let stack = [];
    let curr= [];
    stack = [curr];

    for(let i = 0; i < max; ++i)
    {
        let dupStack = [];
        while(stack.length > 0)
        {
            curr = stack.shift();
            for(let j = 0; j < givenArray.length; ++j)
            {
                let newStack = [...curr];
                newStack.push(givenArray[j]);
                dupStack.push(newStack);
                if( i + 1 == max)
                {
                    let finalString = newStack.join('');
                    if(storageArray.length == 0){
                        storageArray.push({length: 1,stack:[finalString]});
                    }
                    else if(storageArray[storageArray.length-1].length + finalString.length >= quota)
                    {
                        storageArray.push({length: 1,stack:[finalString]});
                    }
                    else 
                    {
                        storageArray[storageArray.length -1].stack.push(finalString);
                        storageArray[storageArray.length -1].length += finalString.length;
                    }
                }
            }
        }
        if( i+1 < max)
        stack = [...dupStack];
        //console.log(dupStack);
    }
    return stack;
};
const pickyFunction = (lengthLimit,base,holder,quota,quotaDocIndex,storageArray) =>{
    let whole = []
    if(holder.length == lengthLimit)
    {
        const finalString = holder.join('');
        
        if(storageArray.length == 0){
            storageArray.push({length: 1,stack:[finalString]});
        }
        else if(storageArray[storageArray.length-1].length + finalString.length >= quota)
        {
            storageArray.push({length: 1,stack:[finalString]});
        }
        else 
        {
            storageArray[storageArray.length -1].stack.push(finalString);
            storageArray[storageArray.length -1].length += finalString.length;
        }

        return [finalString];        
    }
    for(let index = 0; index < base.length; ++index)
    {
        let newHolder = [...holder];
        newHolder.push(base[index]);
        let resultofPicky = pickyFunction(lengthLimit,base,newHolder
            ,quota,quotaDocIndex,storageArray);
        whole.push(...resultofPicky);
    }
    return whole;
};

//generator_function(shortSequence,shortSequenceMaxLength,24,1);
const outterStorageArray = [];
var count  = 0;
for(let i = 1; i <= 14; ++i )
{
   const outterStorageArray = [];
   generator_Function_loop_based(i,french_letters,outterStorageArray,9000);
   outterStorageArray.forEach((each,index)=>{
        let model = `{
            "mot": "Amour",
            "sens": "Sentiment d’affection profonde",
            "famille": "Nom",
            "but": "Exprimer l’attachement et la tendresse",
            "notation": "Positive",
            "synonymes": ["affection", "tendresse", "passion"],
            "mots_associes": ["aimer", "amoureux", "amical"]
        }`;
        let prompt =`system:ton role est d'identifier l'appartenance des mots recus
            a la langue française Utilises ce modèle de dictionnaire ${model}
            pour me rendre la signification des mots. user:
            renvoies un dictionnaire des mots suivants si ils font parti de la langue française. Si tu trouves un par mis eux renseigne son modèle sinon ne renseignes pas ensuite 
            tu mets les mots retrouvés dans un object aux clées définies par les mots eux memes.Je n'ai pas besoin de chats.`;
        try
        {
            if( !fs.existsSync("./copilot"))
            {
                fs.mkdirSync("./copilot");
            }
            fs.writeFileSync("./copilot/text"+(1+count++)+".txt",prompt+"\n"+JSON.stringify(each.stack));
        }
        catch(err)
        {
            console.log(err);
        }
    });
}
console.log(outterStorageArray);
