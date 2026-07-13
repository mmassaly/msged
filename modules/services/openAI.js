const genaiPack = require("@google/genai");
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

async function runOllama(texts, functionTitleList) {
  // Build the system prompt
  const systemPrompt =
    "You are a cv text content to object assistant." +
    " You receive read text and extract Curriculum vitae info" +
    " and collect personal details, experience, degrees and skills then put these into an object" +
    " for each new item in the category inside the curriculum vitae and translate the content into French." +
    " You should be ready to extract the content from the text and put it into the right category." +
    " You should be ready to understand English and French but the end result is in French." +
    " You will return the result as an object for each text with the following format:\n" +
    "{ personalDetails: { prefix:'', functionTitle: /*must be in the list [" + functionTitleList.join(",") + "]*/'', functionTitleTyped:'', fullName:'', email:'', phone:'', address:'' }, experience:[{ name:'', newname:'', company:'', position:'', startDate:'', endDate:'', selectName:'', description:'', id:'', value:'' }], degrees:[{ name:'', newname:'', institution:'', degree:'', fieldOfStudy:'', selectName:'', description:'', startDate:'', endDate:'', id:'', value:'' }], competencies:[{ description:'', name:'', newname:'', value:'', id:'', selectName:'' }]}";

  // Build messages array
  const messages = [
    { role: "system", content: systemPrompt },
    ...texts.map(text => ({
      role: "user",
      content: `Give me the object representation of the curriculum vitae content in the following text:\n${text}`
    }))
  ];

  // Call Ollama chat API
  const response = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tinyllama:1.1b", // ✅ use TinyLlama or another installed model
      messages,
      stream: false
    })
  });

  const data = await response.json();
  const content = data.message?.content || "";

  console.log("Ollama raw output:", content);

  // Try to parse JSON if the model returned structured data
  const  obj = { cvObject: JSON.parse(content) };
  console.log(obj.cvObject.experience,obj.cvObject.degrees,obj.cvObject.competencies,obj.cvObject.skills);
  try {
    return obj;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return { raw: content };
  }``
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

// runOllama(["John Doe\nEmail: john.doe@example.com\nPhone: 123-456-7890\nExperience:\n- Company: ABC Corp\nPosition: Software Engineer\nDuration: Jan 2020 - Present\nSkills: JavaScript, Python, React"],[undefined,"Architecte","Urbaniste","Chargé de mission","Chef de projet","Gestionnaire administratif","Responsable des ressources humaines","Inspecteur des finances","Attaché territorial","Secrétaire administratif","Ingénieur territorial","Conseiller juridique","Contrôleur de gestion","Chargé de communication","Archiviste","Conservateur du patrimoine","Directeur d’établissement public","Agent d’accueil","Technicien supérieur","Responsable informatique/Ingénieur informatique","Chargé des marchés publics","Informaticien Développeur","Hydraulicien","Autre"])
// .then(response => {
//   console.log("Final Response from Ollama:", response);
// }).catch(error => {console.error("Error processing PDF:", error);});


let GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
console.trace("GEMINI_API_KEY:", process?.env?.GEMINI_API_KEY);
const ai = new genaiPack.GoogleGenAI({apiKey: GEMINI_API_KEY});
//ai.models.list().then(models=>console.log(models));


async function main(texts,functionTitleList) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents:  
      "You are a cv text content to object assistant.Your job is to collect personal details"
        +" fill out the experiences and compile them and calculate their length total then collect the degree innformation and the competencies.I do not need any english in the CV all content should be in french except quotes or personal names." 
        +" I will give you an model to fill up based on the text."
        +" You will answer by filling the following given model with the text that Is following in the Text section."
        +" \n ----Model section starts here----"
        +" \n{"
        +"   personalDetails: {"
        +"     prefix: '',"
        +`     functionTitle: /*must be in the list [${functionTitleList.join(',')}]*/'',`
        +"     functionTitleTyped:'',/* if functionTitle not found in the list for functionTitle put title found and format with firstLetterToUpperCase rest is toLowerCase. You can look for appropriate title throughout the document sections for example into experiences or into formations if not provided into personnal details (e.g into Experiences or Formations or profile into or description).*/"
        +"     fullName: '',"
        +"     email: '',"
        +"     phone: '',"
        +"     address: '',"
        +"   },"
        +"   experience:/*This section contains your time in the office and the acquired experience "
        +"  (e.g Worked at Ford Jan 2000 - to present( e.g Jan 2026 26years) as name)"
        +"  .You must compile the experiences that are noted unded label experience name startdate to endate do not break them up.*/ ["
        +"     {"
        +"       name:''/*Name e.g Cashier at Walmart*/,"
        +"       newname:''/*Leave empty*/,"
        +"       company: '',"
        +"       position: '',"
        +"       startDate: '',"
        +"       endDate: ''/*If you see anuthing that means present put Present in english . I will use it in order to calculate the experience.*/,"
        +"       selectName: '' /*calculate the year difference between endDate and startDate."
        +"       If endDate is equal to  string present  or current or any other synonym of them then use fr-FR date format for todays date"+(new Date(Date.now())).toLocaleDateString('en-US',{day:'numeric',month:'numeric',year:'numeric'})+" as endDate."
        +"       The unit is 'ans' for more than 1 year for less than 1 put < 1 an for 1 put 1 an for more than 30 put +30 ans"
        +"       Note that the start year of the job is either dd/MM/yyyy - dd/MM/yyyy or MM/yyyy - MM/yyyy or yyyy - yyyy or from text combinations of month word values like"
        +"       or startDate.toLocaleDateString(french?'fr_FR':'en_US',{date:(long)?'long':'numeric':'',month:long?'long':'numeric',year:'numeric'}) - startDate.toLocaleDateString(french?'fr_FR':'en_US',{date:(long)?'long':'numeric':'',month:long?'long':'numeric',year:'numeric'})where date may not be present eg Juillet 2021 - January 2023 where year difference is 1.5year rounded to 2 year or 2 ans    */,"
        +"       description: '',/*Put all tasks and tools used during that experience to describe it in ideally a parragraph*/"
        +"       id: '' /*put exp for all experience*/,"
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
              selectName: ''/*must be between 'Débutant',"Intermédiaire","Avancé",'Expert'.If experience cites the competency in projects take the cumulation of startDate and endDate difference and use the following rule.if the sum of one or more projects that have cited the competency have a startDate or start year up to another date or year or up to today that is less than or equal to 1 year or unreferenced into experiences, put Débutant. Between 1year-2year put Intermediare. if 2- less than 5 years, put Advancé. if more than 5 say expert. "*/
            },`
        +"     '',"
        +"   ],"
        +" }"
        +" \n ----Model ends here----"
        +".\n----------Text section starts here----------"
        +texts.map(textObj => textObj.text).join('')
        +".\n----------Text section ends here----------"
        +"\n. Now you must fill up the model based on the resume text."
        +"\n.----------Answer formatting section-----------"
        +"\n model whereas model is in json with no comments no delemiters allowing me to use JSON.parse on response.text."
  });
  console.log(response.text);
  return response;
}

const processPDFwithGemini = async (filePath,occupations = [undefined,"Architecte","Urbaniste","Chargé de mission","Chef de projet","Gestionnaire administratif",
      "Responsable des ressources humaines","Inspecteur des finances","Attaché territorial",
      "Secrétaire administratif","Ingénieur territorial","Conseiller juridique","Contrôleur de gestion",
      "Chargé de communication","Archiviste","Conservateur du patrimoine","Directeur d’établissement public",
      "Agent d’accueil","Technicien supérieur","Responsable informatique/Ingénieur informatique",
      "Chargé des marchés publics","Développeur de logiciels","Hydraulicien","Autre"])=>{
  const textObject = await extractTextFromPDF(filePath);
  //console.log(textObject);
  const response = await main(textObject.pages,occupations);
  const cleaned = response.text.replace(/```json\s*|\s*```/g, "");
  console.log(cleaned);
  let returnObject   = {cvObject: JSON.parse(cleaned)};
  
  return returnObject;
  };

//processPDFwithGemini('../__tests__/principal/Administration/CVS/Mamadou_Massaly_CV_FR-5.pdf');

module.exports = {
  run,
  processPDF,
  processPDFwithGemini,
  extractTextFromPDF,
  runOllama
};