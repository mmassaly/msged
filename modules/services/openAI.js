const OpenAI = require("openai");
const dotenv = require('dotenv');
const pdfParse = require('pdf-parse');
const fs = require('node:fs');
dotenv.config();
let api_key = process.env.OPENAI_KEY 
  || 
  "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";
//console.log(process.env.OPENAI_API_KEY);
const client = new OpenAI({
  apiKey: api_key,
});
async function extractTextFromPDF(filePath) {
  const parser = new pdfParse.PDFParse({ url: filePath });

	const result = await parser.getText();
  console.log("Extracted Text:", result);
	return result;
}

async function processPDF(filePath, functionTitleList =[null,"Architecte","Urbaniste","Chargé de mission","Chef de projet","Gestionnaire administratif","Responsable des ressources humaines","Inspecteur des finances","Attaché territorial","Secrétaire administratif","Ingénieur territorial","Conseiller juridique","Contrôleur de gestion","Chargé de communication","Archiviste","Conservateur du patrimoine","Directeur d’établissement public","Agent d’accueil","Technicien supérieur","Responsable informatique/Ingénieur informatique","Chargé des marchés publics","Informaticien Développeur","Hydraulicien","Autre"])
{
  const textObject = await extractTextFromPDF(filePath);
  console.log("Text Object:", textObject);  
  if (textObject) {
    let response = await run([textObject.pages.map(page => page.text).join("\n")],functionTitleList);
    return response;
  } else {
    console.error("Failed to extract text from PDF.");
  } 
  return null;
}

/*processPDF('../__tests__/principal/Administration/CVS/Mamadou_Massaly_CV_FR-5.pdf').then(response => {
  console.log("Final Response:", response);
}).catch(error => {
  console.error("Error processing PDF:", error);
});*/
// run-ollama.js
// runOllama.js
const fetch = require("node-fetch"); // Node 18+ has global fetch, otherwise install node-fetch

async function runOllama(texts, functionTitleList) {
  const systemPrompt = "You are a cv text content to object assistant..." // keep your long prompt

  const messages = [
    { role: "system", content: systemPrompt },
    ...texts.map(text => ({
      role: "user",
      content: `Give me the object representation of the curriculum vitae content in the following text:\n${text}`
    }))
  ];

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen:0.5b",   // ✅ must match installed model
      messages,
      stream: false
    })
  });

  const data = await response.json();
  const content = data.message?.content || "";
  console.log("Ollama raw content:", content);

  try {
    return { cvObject: JSON.parse(content) };
  } catch {
    return { raw: content };
  }
}

async function run(texts,functionTitleList ) {
  // Example: Chat completion
  const response = await client.chat.completions.create({
    model: "gpt-5-nano",//"gpt-4.1-mini", "gpt-4.1", "gpt-4.1-turbo"
    messages: [
      { role: "system", content: 
        "You are a cv text content to object assistant." 
        +"You receive read text and extract Cirriculum vitae info"
        +" and collect personal details, experience, degrees and skill then put these into an object"
        +" for each new item in the"
        +" category inside the cirriculum vitae and translate the content into french"
        +" you should be ready to extract the content from the text and put it into the right category"
        +" you should be ready to understand english and french but"
        +" the end result is in french."
        +" you will return the result as an object for each text with the following format:"
        +" \n{"
        +"   personalDetails: {"
        +"     prefix: '',"
        +`     functionTitle: /*must be in the list [${functionTitleList.join(',')}]*/'',`
        +"     functionTitleTyped:'',/* if not found in the list for functionTitle put title found*/"
        +"     fullName: '',"
        +"     email: '',"
        +"     phone: '',"
        +"     address: '',"
        +"   },"
        +"   experience: ["
        +"     {"
        +"       name:''/* name of the experience for example if the experience is a job then put the name of the job if it's a project put the name of the project and so on*/,"
        +"       newname:''/*Leave empty*/,"
        +"       company: '',"
        +"       position: '',"
        +"       startDate: '',"
        +"       endDate: '',"
        +"       selectName: '' /*round the difference between endDate and startDate into year then unit is ans for more than 1 for less than 1 put < 1 an for 1 put 1 an for +30 put +30 ans*/,"
        +"       description: '',"
        +"       id: '' /*put deg for all experience*/,"
        +"       value:''/*put index of array element as an integer*/"
        +"     },"
        +"   ],"
        +"   degrees: ["
        +"     {"
        +"       name:'',/*same as key degree value*/"
        +"       newname:''/*Leave empty*/,"
        +"       institution: '',"
        +"       degree: '',"
        +"       fieldOfStudy: '',"
        +"       selectName: '' /*Doctorat,Master,License,BTS,Baccalauréat,BFEM,CFEE,autre,non-diplomé*/,"
        +"       description: '',"
        +"       startDate: '',"
        +"       endDate: '',"
        +"       id: '' /*put deg for all degree element*/,"
        +"       value: /*put index of array element as an integer*/"
        +"     }"
        +"   ],"
        +"   competencies/*alias for skills*/: ["
        +`  {
              description": ""/*description of the skill for example if the skill is a language put the level of the language and so on*/,
              name: ""/*name or title of competency*/,
              newname: ""/*Leave empty*/,
              value:''/*put index of array element as an integer*/,
              id: ''/*put comp for all skill element*/,
              selectName: ''/*must be between undefined,"Débutant","Intermédiaire","Avancé","Expert"*/
            },`
        +"     '',"
        +"   ],"
        +" }"
        +"\nTHe next steps involve the following steps:"
        +"Make sure to fill in the object with the extracted information"
        +" from the text and translate it into french.\n"
        +" If any information is missing in the text,"
        +" leave the corresponding field empty in the object.\n"
        +" If there are multiple user messages,"
        +" process each one and return an array of objects as the final result."
        },...texts.map(text => ({
  role: "user",
  content: `Give me the object representation
of the curriculum vitae content in the following text:\n${text}`
}))
    ]
  });

  console.log(response.choices[0].message.content);
  return {cvObject:JSON.parse(response.choices[0].message.content)};
}

runOllama(["John Doe\nEmail: john.doe@example.com\nPhone: 123-456-7890\nExperience:\n- Company: ABC Corp\nPosition: Software Engineer\nDuration: Jan 2020 - Present\nSkills: JavaScript, Python, React"],[undefined,"Architecte","Urbaniste","Chargé de mission","Chef de projet","Gestionnaire administratif","Responsable des ressources humaines","Inspecteur des finances","Attaché territorial","Secrétaire administratif","Ingénieur territorial","Conseiller juridique","Contrôleur de gestion","Chargé de communication","Archiviste","Conservateur du patrimoine","Directeur d’établissement public","Agent d’accueil","Technicien supérieur","Responsable informatique/Ingénieur informatique","Chargé des marchés publics","Informaticien Développeur","Hydraulicien","Autre"])
.then(response => {
  console.log("Final Response from Ollama:", response);
}).catch(error => {console.error("Error processing PDF:", error);});

module.exports = {
  run,
  processPDF,
  extractTextFromPDF,
  runOllama
};