(function () {
  var form = document.getElementById("product-finder-form");
  var finder = form ? form.closest(".finder") : null;
  var stepMount = document.getElementById("finder-step");
  var stepCount = document.getElementById("finder-step-count");
  var stepSummary = document.getElementById("finder-step-summary");
  var backButton = document.getElementById("finder-back");
  var nextButton = document.getElementById("finder-next");
  var results = document.getElementById("finder-results");

  if (!form || !finder || !stepMount || !stepCount || !stepSummary || !backButton || !nextButton || !results) return;

  var productFamilies = {
    printer: {
      desktop: ["Zebra ZD421/ZD621", "Honeywell PC series", "TSC desktop", "Citizen desktop"],
      industrial: ["Zebra ZT231/ZT411/ZT610", "Honeywell PD/PX/PM series", "TSC MH/MB series", "SATO CLNX"],
      mobile: ["Zebra ZQ series", "Honeywell mobile printer", "TSC Alpha mobile"],
      rfid: ["Zebra ZD621R/ZT411R", "SATO RFID", "TSC RFID-capable printers"],
      receipt: ["Citizen POS", "Zebra receipt printer", "Epson-compatible POS paper workflow"]
    },
    supplies: {
      directThermal: ["Direct thermal paper labels", "Top-coated direct thermal labels", "Receipt paper"],
      transferPaper: ["Thermal transfer paper labels", "Wax ribbon", "General-purpose permanent adhesive"],
      synthetic: ["Polypropylene or polyester labels", "Wax-resin or resin ribbon", "Special adhesive as needed"],
      tags: ["Thermal transfer tags", "Custom hang tags", "Inventory tags"],
      rfid: ["RFID labels", "RFID tags", "Printer-specific RFID media"],
      receipt: ["Receipt paper", "POS rolls", "Printer-specific core and roll width"]
    }
  };

  var state = {
    need: "printer-materials",
    workflow: "shipping",
    volume: "medium",
    environment: "standard",
    printerModel: "",
    width: "4"
  };
  var currentStep = 0;

  var questions = [
    {
      id: "need",
      title: "What are you trying to find?",
      help: "Start here so the next questions stay relevant.",
      type: "choice",
      options: [
        ["printer-materials", "Materials for my printer", "Labels, tags, ribbons, RFID media, or receipt paper."],
        ["materials", "Labels or materials", "You need supplies, but may not know the printer model yet."],
        ["printer", "A barcode printer", "You need help picking the printer family first."]
      ]
    },
    {
      id: "printerModel",
      title: "What printer do you have?",
      help: "Model number is best. Leave blank if you do not know it.",
      type: "text",
      placeholder: "Example: Zebra ZD421, ZT411, Honeywell PM45",
      show: function (data) {
        return data.need === "printer-materials";
      }
    },
    {
      id: "workflow",
      title: "What is the main job?",
      help: "This narrows the printer class and supply type.",
      type: "choice",
      options: [
        ["shipping", "Shipping or warehouse", "Inventory, cartons, bin labels, receiving, pick/pack."],
        ["retail", "Retail or product labels", "Shelf labels, product IDs, price labels, packaging."],
        ["durable", "Durable asset labels", "Outdoor, chemical, abrasion, long-life, asset tracking."],
        ["food", "Food or freezer labels", "Cold, moisture, compliance, date coding, food handling."],
        ["receipt", "Receipt or POS paper", "Point-of-sale receipt printer supplies."],
        ["rfid", "RFID labels or printer", "RFID media, encoding, or RFID-capable printers."]
      ]
    },
    {
      id: "volume",
      title: "How much printing will it do?",
      help: "For printers, volume usually determines desktop vs industrial.",
      type: "choice",
      options: [
        ["low", "Occasional", "Office, light retail, small batches."],
        ["medium", "Daily", "Department use, regular shipping, steady operations."],
        ["high", "High volume", "Warehouse, production, multi-shift, heavy-duty use."]
      ]
    },
    {
      id: "environment",
      title: "How long does the label need to last?",
      help: "This decides direct thermal vs transfer and ribbon formula.",
      type: "choice",
      options: [
        ["short", "Short term indoor", "Shipping labels, receipts, temporary inventory labels."],
        ["standard", "General business use", "Normal handling, indoor storage, everyday operations."],
        ["harsh", "Harsh or long term", "Abrasion, chemicals, freezer, heat, moisture, outdoor use."]
      ],
      show: function (data) {
        return data.workflow !== "receipt";
      }
    },
    {
      id: "width",
      title: "How wide is the label or media?",
      help: "Use the widest label you need the printer or material to support.",
      type: "choice",
      options: [
        ["2", "Up to 2 inches", "Small product labels, shelf labels, wristbands, narrow tags."],
        ["4", "Up to 4 inches", "Most shipping, warehouse, product, and compliance labels."],
        ["6", "Up to 6 inches", "Larger carton, pallet, and industrial label formats."],
        ["wide", "Wider than 6 inches", "Wide-format or specialty printing."]
      ]
    }
  ];

  function activeQuestions() {
    return questions.filter(function (question) {
      return !question.show || question.show(state);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function titleCase(value) {
    return value
      .replace(/-/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function printerClass(data) {
    if (data.workflow === "receipt") return "receipt";
    if (data.workflow === "rfid") return "rfid";
    if (data.volume === "high" || data.width === "6" || data.width === "wide") return "industrial";
    if (data.volume === "low") return "desktop";
    return "desktop or light-industrial";
  }

  function materialClass(data) {
    if (data.workflow === "receipt") return "receipt";
    if (data.workflow === "rfid") return "rfid";
    if (data.environment === "short" && data.workflow === "shipping") return "directThermal";
    if (data.environment === "harsh" || data.workflow === "durable" || data.workflow === "food") return "synthetic";
    if (data.workflow === "retail") return "transferPaper";
    return data.environment === "short" ? "directThermal" : "transferPaper";
  }

  function ribbonAdvice(material) {
    if (material === "directThermal" || material === "receipt") {
      return "No ribbon is normally needed for direct thermal labels or receipt paper.";
    }

    if (material === "synthetic" || material === "rfid") {
      return "Ask for wax-resin or full resin ribbon, then confirm the ribbon size, ink side, and printer compatibility.";
    }

    return "Ask for a wax ribbon for paper labels, or wax-resin if the label sees abrasion or moisture.";
  }

  function catalogTarget(data, printer, material) {
    if (data.workflow === "rfid" || printer === "rfid" || material === "rfid") return "RFID printer and RFID media catalog";
    if (data.workflow === "receipt" || material === "receipt") return "Citizen/POS and receipt paper catalog";
    if (/zebra/i.test(data.printerModel)) return "Zebra printer and supplies catalog";
    if (/honeywell|intermec|datamax/i.test(data.printerModel)) return "Honeywell printer and supplies catalog";
    if (/tsc/i.test(data.printerModel)) return "TSC printer and supplies catalog";
    if (/sato/i.test(data.printerModel)) return "SATO printer and supplies catalog";
    return "Printer brand catalog plus supplies catalog";
  }

  function renderList(items) {
    return items.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
  }

  function recommendation(data) {
    var printer = printerClass(data);
    var material = materialClass(data);
    var printerOptions = productFamilies.printer[printer] || productFamilies.printer.industrial;
    var supplyOptions = productFamilies.supplies[material];
    var knownPrinter = data.printerModel.trim();

    var lead = data.need === "printer"
      ? "Start with a " + printer + " barcode printer family."
      : "Start with " + supplyOptions[0] + ".";

    if (data.need === "printer-materials" && knownPrinter) {
      lead = "Match supplies to " + knownPrinter + " before ordering.";
    }

    var confirm = [
      "Exact printer brand and model",
      "Label width, height, core size, and maximum outside diameter",
      "Direct thermal vs thermal transfer print technology",
      "Quantity, roll count, and reorder frequency"
    ];

    if (data.need === "printer") {
      confirm.unshift("Printer duty cycle, print width, resolution, connectivity, and workspace");
    }

    if (material !== "directThermal" && material !== "receipt") {
      confirm.push("Ribbon width, length, core, ink side, and formula");
    }

    if (data.environment === "harsh" || data.workflow === "durable" || data.workflow === "food") {
      confirm.push("Adhesive, facestock, temperature, chemical, freezer, moisture, or outdoor exposure");
    }

    var script = [
      "I need help ordering barcode supplies.",
      knownPrinter ? "Printer: " + knownPrinter + "." : "Printer: please help me choose or confirm compatibility.",
      "Workflow: " + titleCase(data.workflow) + ".",
      "Volume: " + titleCase(data.volume) + ".",
      "Environment: " + titleCase(data.environment) + ".",
      "Label width: " + titleCase(data.width) + ".",
      "Recommended starting point: " + lead,
      "Ribbon note: " + ribbonAdvice(material)
    ].join("\n");

    return {
      lead: lead,
      printerFamilies: printerOptions,
      supplyFamilies: supplyOptions,
      confirm: confirm,
      catalog: catalogTarget(data, printer, material),
      ribbon: ribbonAdvice(material),
      script: script
    };
  }

  function renderQuestion() {
    var steps = activeQuestions();
    var question = steps[currentStep];

    if (!question) {
      currentStep = Math.max(0, steps.length - 1);
      question = steps[currentStep];
    }

    stepCount.textContent = "Step " + (currentStep + 1) + " of " + steps.length;
    stepSummary.textContent = currentStep === 0 ? "Start with what you need." : "Building a call-ready spec.";
    backButton.disabled = currentStep === 0;
    backButton.style.visibility = currentStep === 0 ? "hidden" : "visible";
    nextButton.textContent = currentStep === steps.length - 1 ? "Show recommendation" : "Next";
    finder.classList.remove("finder--show-results");

    var html = [
      '<div class="finder-step__label">',
      "<span>" + escapeHtml(question.title) + "</span>",
      "<small>" + escapeHtml(question.help) + "</small>",
      "</div>"
    ];

    if (question.type === "text") {
      html.push(
        '<label class="finder-text-field">Printer model',
        '<input type="text" name="' + question.id + '" value="' + escapeHtml(state[question.id]) + '" placeholder="' + escapeHtml(question.placeholder) + '">',
        "</label>"
      );
    } else {
      html.push('<div class="finder-options">');
      question.options.forEach(function (option) {
        var checked = state[question.id] === option[0] ? " checked" : "";
        html.push(
          '<label class="finder-option">',
          '<input type="radio" name="' + question.id + '" value="' + escapeHtml(option[0]) + '"' + checked + ">",
          "<span><strong>" + escapeHtml(option[1]) + "</strong><small>" + escapeHtml(option[2]) + "</small></span>",
          "</label>"
        );
      });
      html.push("</div>");
    }

    stepMount.innerHTML = html.join("");
  }

  function saveCurrentStep() {
    var steps = activeQuestions();
    var question = steps[currentStep];
    var field = stepMount.querySelector('[name="' + question.id + '"]');

    if (!field) return;

    if (question.type === "text") {
      state[question.id] = field.value;
    } else {
      var selected = stepMount.querySelector('[name="' + question.id + '"]:checked');
      if (selected) state[question.id] = selected.value;
    }

    if (question.id === "need" && state.need !== "printer-materials") {
      state.printerModel = "";
    }
  }

  function renderResults() {
    var rec = recommendation(state);

    results.innerHTML = [
      '<div class="result-stack">',
      '<div class="result-card">',
      '<strong>Recommendation</strong>',
      "<h3>" + escapeHtml(rec.lead) + "</h3>",
      "<p>" + escapeHtml(rec.ribbon) + "</p>",
      "</div>",
      '<div class="result-card">',
      "<strong>Product families to ask about</strong>",
      "<ul>" + renderList(rec.printerFamilies.concat(rec.supplyFamilies)) + "</ul>",
      "</div>",
      '<div class="result-card">',
      "<strong>Confirm before ordering</strong>",
      "<ul>" + renderList(rec.confirm) + "</ul>",
      "</div>",
      '<div class="result-card">',
      "<strong>Catalog section</strong>",
      "<p>" + escapeHtml(rec.catalog) + "</p>",
      "</div>",
      '<textarea class="call-script" readonly aria-label="Call script">' + escapeHtml(rec.script) + "</textarea>",
      '<div class="finder-actions">',
      '<button class="button button--secondary" type="button" id="finder-edit">Back to finder</button>',
      '<a class="button button--primary" href="tel:+19495550123">Call with this spec</a>',
      '<a class="button button--secondary" href="#catalogs">Open catalogs</a>',
      "</div>",
      "</div>"
    ].join("");

    finder.classList.add("finder--show-results");

    var editButton = document.getElementById("finder-edit");
    if (editButton) {
      editButton.addEventListener("click", function () {
        finder.classList.remove("finder--show-results");
        renderQuestion();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (window.matchMedia("(max-width: 640px)").matches) {
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  stepMount.addEventListener("change", saveCurrentStep);
  stepMount.addEventListener("input", saveCurrentStep);

  backButton.addEventListener("click", function () {
    saveCurrentStep();
    currentStep = Math.max(0, currentStep - 1);
    renderQuestion();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    saveCurrentStep();

    var steps = activeQuestions();
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderQuestion();
      return;
    }

    renderResults();
  });

  renderQuestion();
}());
