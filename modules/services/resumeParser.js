const ResumeParser = require('simple-resume-parser');

async function runResumeParser(filePath, functionTitleList) {
  try {
    // Parse a local resume file (PDF, DOC, DOCX, TXT, RTF, HTML)
    const resume = new ResumeParser(filePath);
    resume.parseToJSON()
    .then(parsed => {
        console.log('Yay! ', parsed);
        const cvObject = {
            personalDetails: {
                prefix: '',
                functionTitle: functionTitleList.find(title =>
                parsed.skills?.some(skill => skill.toLowerCase().includes(title.toLowerCase()))
                ) || '',
                functionTitleTyped: parsed.headline || '',
                fullName: parsed.name || '',
                email: parsed.email || '',
                phone: parsed.phone || '',
                address: parsed.location || ''
            },
            experience: (parsed.experience || []).map((exp, idx) => ({
                name: exp.title || '',
                newname: '',
                company: exp.company || '',
                position: exp.title || '',
                startDate: exp.startDate || '',
                endDate: exp.endDate || '',
                selectName: '', // you can calculate duration here
                description: exp.summary || '',
                id: 'deg',
                value: idx
            })),
            degrees: (parsed.education || []).map((edu, idx) => ({
                name: edu.degree || '',
                newname: '',
                institution: edu.institution || '',
                degree: edu.degree || '',
                fieldOfStudy: edu.area || '',
                selectName: '', // map to Doctorat/Master/etc.
                description: '',
                startDate: edu.startDate || '',
                endDate: edu.endDate || '',
                id: 'deg',
                value: idx
            })),
            competencies: (parsed.skills || []).map((skill, idx) => ({
                description: '',
                name: skill,
                newname: '',
                value: idx,
                id: 'comp',
                selectName: '' // Débutant, Intermédiaire, Avancé, Expert
            }))
            };

    })
    .catch(error => {
        console.error(error);
    });

    // The parsed result is JSON with fields like name, email, phone, education, skills, experience
   
    // Now map it into your desired cvObject format
    
    return { cvObject };
  } catch (err) {
    console.error("Error parsing resume:", err);
    return null;
  }
}

runResumeParser('../services/__tests__/Mamadou_Massaly_CV_FR_V2-5.pdf', ['Développeur Logiciel', 'Ingénieur Full Stack'])