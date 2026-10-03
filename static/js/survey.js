const steps = [...document.querySelectorAll(".step")];
const form = document.getElementById("surveyForm");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const submitMessage = document.getElementById("submitMessage");
const newResponseBtn = document.getElementById("newResponseBtn");
let currentStep = 0;

function showStep(index){
  currentStep = Math.max(0, Math.min(index, 7));
  steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step) === currentStep));

  const pct = Math.round(currentStep / 7 * 100);
  progressBar.style.width = `${pct}%`;
  progressPercent.textContent = `${pct}%`;

  if(currentStep === 0){
    progressLabel.textContent = "Inicio";
  }else if(currentStep === 7){
    progressLabel.textContent = "Completado";
  }else{
    progressLabel.textContent = `Sección ${currentStep} de 6`;
  }

  document.querySelector(".progress-wrap").classList.toggle("completed", currentStep === 7);
  window.scrollTo({top:0, behavior:"smooth"});
}

function valueFor(name){
  const items = [...document.querySelectorAll(`[name="${name}"]`)];
  if(!items.length) return "";

  if(items[0].type === "checkbox"){
    return items.filter(i => i.checked).map(i => i.value);
  }

  if(items[0].type === "radio"){
    const checked = items.find(i => i.checked);
    return checked ? checked.value : "";
  }

  return items[0].value.trim();
}

function questionAnswered(q){
  const value = valueFor(String(q));
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function validateStep(step){
  step.querySelectorAll(".question").forEach(q => q.classList.remove("invalid"));

  let required = [];
  const n = Number(step.dataset.step);

  if(n === 1) required = [1,2,3,4,5];
  if(n === 2) required = [6,7,8,9,10,11,12];
  if(n === 3) required = [13,14];
  if(n === 3 && valueFor("14") === "Sí") required.push(15,16,17,18,19,20);
  if(n === 4 && valueFor("14") === "Sí") required = [21,22,23,24,25];
  if(n === 5) required = [26,27,28];
  if(n === 6) required = [29,30];

  const missing = required.filter(q => !questionAnswered(q));

  missing.forEach(q => {
    const block = document.querySelector(`.question[data-q="${q}"]`);
    if(block) block.classList.add("invalid");
  });

  if(missing.length){
    const first = document.querySelector(`.question[data-q="${missing[0]}"]`);
    first?.scrollIntoView({behavior:"smooth", block:"center"});
    return false;
  }

  return true;
}

document.querySelectorAll(".next-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const active = document.querySelector(".step.active");

    if(!window.ADMIN_PREVIEW && currentStep !== 0 && !validateStep(active)) return;

    // El PDF indica que si la pregunta 14 es "No", se continúa directamente en la Sección 5.
    if(!window.ADMIN_PREVIEW && currentStep === 3 && valueFor("14") === "No"){
      showStep(5);
      syncCustomerState();
      return;
    }

    showStep(currentStep + 1);
    syncCustomerState();
  });
});

document.querySelectorAll(".prev-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    // Si no es cliente y está en Sección 5, vuelve a Sección 3.
    if(!window.ADMIN_PREVIEW && currentStep === 5 && valueFor("14") === "No"){
      showStep(3);
      return;
    }
    showStep(currentStep - 1);
  });
});

function syncOtherFields(){
  document.querySelectorAll(".other-field").forEach(field => {
    const q = field.dataset.otherFor;
    const selected = valueFor(q);

    const show = Array.isArray(selected)
      ? selected.some(v => v === "Otro" || v === "Otros")
      : (selected === "Otro" || selected === "Otros");

    field.classList.toggle("show", show);

    if(!show){
      field.value = "";
    }
  });
}

function syncCustomerState(){
  const explicitlyNo = valueFor("14") === "No";
  const customerQuestions = document.getElementById("customerQuestions");
  const satisfactionQuestions = document.getElementById("satisfactionQuestions");
  const notCustomerMessage = document.getElementById("notCustomerMessage");

  customerQuestions.classList.toggle("hidden", explicitlyNo);
  satisfactionQuestions.classList.toggle("hidden", explicitlyNo);
  notCustomerMessage.classList.toggle("hidden", !explicitlyNo);

  if(explicitlyNo){
    [...customerQuestions.querySelectorAll("input"),
     ...satisfactionQuestions.querySelectorAll("input")].forEach(i => i.checked = false);
  }
}

document.addEventListener("change", e => {
  syncOtherFields();

  if(e.target.name === "14"){
    syncCustomerState();
  }
});

function collectAnswers(){
  const answers = {};

  for(let q = 1; q <= 30; q++){
    let val = valueFor(String(q));
    const other = document.querySelector(`[data-other-for="${q}"]`);

    if(other && other.classList.contains("show") && other.value.trim()){
      if(Array.isArray(val)){
        val = val.filter(v => v !== "Otro" && v !== "Otros");
        val.push(`Otro: ${other.value.trim()}`);
      }else if(val === "Otro" || val === "Otros"){
        val = `Otro: ${other.value.trim()}`;
      }
    }

    if(val && (!Array.isArray(val) || val.length)){
      answers[String(q)] = val;
    }
  }

  return answers;
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const active = document.querySelector(".step.active");
  if(!validateStep(active)) return;

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Guardando…";
  submitMessage.textContent = "";

  try{
    const response = await fetch("/api/submit", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({answers:collectAnswers()})
    });

    const data = await response.json();

    if(!response.ok){
      throw new Error(data.message || "No se pudo guardar la encuesta.");
    }

    form.reset();
    syncOtherFields();
    syncCustomerState();
    showStep(7);

  }catch(err){
    submitMessage.className = "submit-message error";
    submitMessage.textContent = err.message;
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar encuesta";
  }
});

newResponseBtn?.addEventListener("click", () => {
  form.reset();
  syncOtherFields();
  syncCustomerState();
  showStep(0);
});

document.querySelectorAll(".choices label, .scale label").forEach(label => {
  label.setAttribute("tabindex","0");

  label.addEventListener("keydown", e => {
    if(e.key === "Enter" || e.key === " "){
      const input = label.querySelector("input");
      if(input){
        e.preventDefault();
        input.click();
      }
    }
  });
});

document.querySelectorAll(".primary-btn, .secondary-btn").forEach(btn => {
  btn.addEventListener("pointerdown", () => btn.style.transform = "scale(.985)");
  btn.addEventListener("pointerup", () => btn.style.transform = "");
  btn.addEventListener("pointerleave", () => btn.style.transform = "");
});

showStep(0);
syncCustomerState();

if(window.ADMIN_PREVIEW){
  const submitBtn = document.getElementById("submitBtn");
  if(submitBtn){
    submitBtn.type = "button";
    submitBtn.textContent = "Vista previa: no se enviarán datos";
    submitBtn.addEventListener("click", ()=>showStep(7));
  }
}
