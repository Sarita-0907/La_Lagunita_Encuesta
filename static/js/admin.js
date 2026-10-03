
const chartsGrid = document.getElementById("chartsGrid");
const tablesGrid = document.getElementById("tablesGrid");
const openAnswers = document.getElementById("openAnswers");
const chartsSection = document.getElementById("chartsSection");
const tablesSection = document.getElementById("tablesSection");
const viewChartsBtn = document.getElementById("viewChartsBtn");
const viewTablesBtn = document.getElementById("viewTablesBtn");

const chartInstances = [];

const colors = [
  "#F7E600", "#1599D6", "#4E9B2D", "#EE6A92",
  "#111111", "#82C341", "#65B8E8", "#F4A6BF"
];

function chartTypeFor(q, labels){
  const n = Number(q);

  if([2,12,13,14,19,23,24,26].includes(n) && labels.length <= 6){
    return "doughnut";
  }

  if([18,20,21,22,25].includes(n)){
    return "radar";
  }

  return "bar";
}

function chartOptions(type, q){
  const isRadar = type === "radar";
  const isDoughnut = type === "doughnut";
  const horizontal = type === "bar" && Number(q) !== 1;

  const options = {
    responsive:true,
    maintainAspectRatio:false,
    plugins:{
      legend:{
        display:isDoughnut || isRadar,
        position:"bottom"
      },
      tooltip:{enabled:true}
    }
  };

  if(type === "bar"){
    options.indexAxis = horizontal ? "y" : "x";
    options.scales = {
      x: horizontal
        ? {beginAtZero:true, ticks:{precision:0}}
        : {ticks:{autoSkip:false}},
      y: horizontal
        ? {ticks:{autoSkip:false}}
        : {beginAtZero:true, ticks:{precision:0}}
    };
  }

  if(isRadar){
    options.scales = {
      r:{
        beginAtZero:true,
        ticks:{precision:0, display:false}
      }
    };
  }

  return options;
}

function chartName(type, q){
  if(type === "doughnut") return "Gráfico de anillo";
  if(type === "radar") return "Gráfico de radar";
  if(type === "bar" && Number(q) === 1) return "Gráfico de columnas";
  return "Gráfico de barras";
}

function buildQuestionChart(q, item){
  const card = document.createElement("article");
  card.className = "chart-card";

  const title = document.createElement("h3");
  title.textContent = `${q}. ${item.question}`;

  const caption = document.createElement("p");
  caption.className = "chart-caption";

  const holder = document.createElement("div");
  holder.className = "chart-holder";

  const canvas = document.createElement("canvas");
  holder.appendChild(canvas);

  card.append(title, caption, holder);
  chartsGrid.appendChild(card);

  if(!item.labels.length){
    caption.textContent = "Sin datos para representar.";
    holder.innerHTML = '<div class="loading">Sin respuestas todavía.</div>';
    return;
  }

  const type = chartTypeFor(q, item.labels);
  caption.textContent = `${chartName(type, q)} · Frecuencia de respuestas.`;

  const chart = new Chart(canvas, {
    type,
    data:{
      labels:item.labels,
      datasets:[{
        label:"Respuestas",
        data:item.values,
        backgroundColor:type === "bar" ? colors[1] : colors,
        borderColor:type === "radar" ? colors[1] : "#ffffff",
        borderWidth:type === "radar" ? 2 : 1,
        fill:type === "radar"
      }]
    },
    options:chartOptions(type, q)
  });

  chartInstances.push(chart);
}

function buildQuestionTable(q, item){
  const card = document.createElement("article");
  card.className = "result-table-card";

  const title = document.createElement("h3");
  title.textContent = `${q}. ${item.question}`;
  card.appendChild(title);

  if(!item.labels.length){
    const empty = document.createElement("div");
    empty.className = "loading";
    empty.textContent = "Sin respuestas todavía.";
    card.appendChild(empty);
    tablesGrid.appendChild(card);
    return;
  }

  const total = item.values.reduce((sum, value) => sum + value, 0);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const table = document.createElement("table");
  table.className = "frequency-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Respuesta / categoría</th>
        <th>Frecuencia</th>
        <th>Porcentaje</th>
      </tr>
    </thead>
    <tbody>
      ${item.labels.map((label, index) => {
        const value = item.values[index];
        const pct = total ? ((value / total) * 100).toFixed(1) : "0.0";
        return `
          <tr>
            <td>${escapeHtml(label)}</td>
            <td>${value}</td>
            <td>${pct}%</td>
          </tr>`;
      }).join("")}
    </tbody>
    <tfoot>
      <tr>
        <th>Total</th>
        <th>${total}</th>
        <th>100%</th>
      </tr>
    </tfoot>
  `;

  wrap.appendChild(table);
  card.appendChild(wrap);
  tablesGrid.appendChild(card);
}

function buildTrendChart(trend){
  const canvas = document.getElementById("trendChart");
  if(!canvas) return;

  new Chart(canvas,{
    type:"line",
    data:{
      labels:trend.map(x=>x.day),
      datasets:[{
        label:"Respuestas por día",
        data:trend.map(x=>x.total),
        borderColor:colors[1],
        backgroundColor:"rgba(21,153,214,.16)",
        fill:true,
        tension:.32,
        pointRadius:4
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{
        y:{beginAtZero:true,ticks:{precision:0}}
      },
      plugins:{legend:{display:false}}
    }
  });
}

function buildScatterChart(points){
  const canvas = document.getElementById("scatterChart");
  if(!canvas) return;

  new Chart(canvas,{
    type:"scatter",
    data:{
      datasets:[{
        label:"Edad vs gasto",
        data:points.map(p=>({x:p.age,y:p.spend})),
        backgroundColor:colors[3]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{
        x:{title:{display:true,text:"Edad aproximada del rango"}},
        y:{
          title:{display:true,text:"Gasto aproximado por visita ($)"},
          beginAtZero:true
        }
      }
    }
  });
}

function setResultsView(view){
  const showCharts = view === "charts";

  chartsSection?.classList.toggle("hidden", !showCharts);
  tablesSection?.classList.toggle("hidden", showCharts);

  viewChartsBtn?.classList.toggle("active", showCharts);
  viewTablesBtn?.classList.toggle("active", !showCharts);
}

viewChartsBtn?.addEventListener("click", () => setResultsView("charts"));
viewTablesBtn?.addEventListener("click", () => setResultsView("tables"));

async function loadStats(){
  const res = await fetch("/admin/api/stats");

  if(!res.ok){
    chartsGrid.innerHTML = '<div class="loading">No fue posible cargar los resultados.</div>';
    if(tablesGrid) tablesGrid.innerHTML = '<div class="loading">No fue posible cargar las tablas.</div>';
    return;
  }

  const data = await res.json();

  chartsGrid.innerHTML = "";
  if(tablesGrid) tablesGrid.innerHTML = "";
  openAnswers.innerHTML = "";

  buildTrendChart(data.trend || []);
  buildScatterChart(data.scatter || []);

  Object.entries(data.stats).forEach(([q,item]) => {
    if(item.type === "text"){
      const card = document.createElement("article");
      card.className = "answer-card";
      card.innerHTML = `
        <h3>${q}. ${item.question}</h3>
        <p class="chart-caption">Respuestas abiertas registradas.</p>
        <div class="answer-list">
          ${item.responses.length
            ? item.responses.map(r=>`<div class="answer-item">${escapeHtml(r)}</div>`).join("")
            : '<div class="answer-item">Sin respuestas todavía.</div>'}
        </div>`;
      openAnswers.appendChild(card);
      return;
    }

    buildQuestionChart(q,item);
    buildQuestionTable(q,item);
  });
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

setResultsView("charts");
loadStats();
