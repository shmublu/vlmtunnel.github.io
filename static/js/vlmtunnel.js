(function() {
  const manifests = {
    objectReid: [],
    scavenger: [],
    circuit: []
  };

  const state = {
    objectReid: { correct: 0, total: 0, current: null, comparison: null },
    scavenger: { correct: 0, total: 0, current: null, comparison: null },
    circuit: { correct: 0, total: 0, current: null, comparison: null }
  };

  const benchmarks = {
    objectReid: {
      human: 100,
      top: [
        { name: 'GPT-5', score: 60 },
        { name: 'o4-mini', score: 56 },
        { name: 'Claude 4 Sonnet', score: 55 }
      ],
      pool: [
        { name: 'Gemini 2.5 Pro', score: 53 },
        { name: 'o3', score: 54 },
        { name: 'Claude 3.7 Sonnet', score: 49 },
        { name: 'Gemma 3 (27B)', score: 53 },
        { name: 'Mistral Small 3.1 (24B)', score: 51 }
      ]
    },
    scavenger: {
      human: 100,
      top: [
        { name: 'Gemini 2.5 Pro', score: 69 },
        { name: 'GPT-5', score: 54 },
        { name: 'o4-mini', score: 44 }
      ],
      pool: [
        { name: 'o3', score: 18 },
        { name: 'Claude 4 Sonnet', score: 19 },
        { name: 'Claude 3.7 Sonnet', score: 13 },
        { name: 'Phi-4 Multimodal (14B)', score: 15 },
        { name: 'Gemma 3 (27B)', score: 13 },
        { name: 'Qwen2.5VL (7B)', score: 9 }
      ]
    },
    circuit: {
      human: 99,
      top: [
        { name: 'Gemini 2.5 Pro', score: 41 },
        { name: 'GPT-5', score: 38 },
        { name: 'Claude 3.7 Sonnet', score: 34 }
      ],
      pool: [
        { name: 'o4-mini', score: 32 },
        { name: 'Claude 4 Sonnet', score: 32 },
        { name: 'o3', score: 32 },
        { name: 'InternVL3 (14B)', score: 31 },
        { name: 'Qwen2.5VL (32B)', score: 19 },
        { name: 'Mistral Small 3.1 (24B)', score: 20 }
      ]
    }
  };

  function fetchJSON(path) {
    return fetch(path).then(function(resp) {
      if (!resp.ok) {
        throw new Error('Failed to fetch ' + path);
      }
      return resp.json();
    });
  }

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function listToEnglish(list) {
    if (!list || !list.length) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + ' and ' + list[1];
    return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
  }

  function capitalize(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  function formatScore(score) {
    if (score == null || isNaN(score)) return '–';
    return (Math.round(score * 10) / 10).toString().replace(/\.0$/, '') + '%';
  }

  function cacheBusted(src) {
    if (!src) return src;
    const token = 'v=' + Date.now();
    return src.includes('?') ? src + '&' + token : src + '?' + token;
  }

  function setImageWithFade(img, src) {
    if (!img || !src) return;
    img.classList.add('is-fading');
    const url = cacheBusted(src);
    const onLoad = function() {
      img.classList.remove('is-fading');
    };
    img.addEventListener('load', onLoad, { once: true });
    img.src = url;
    if (img.complete) {
      requestAnimationFrame(() => img.classList.remove('is-fading'));
    }
  }

  function pickComparison(skill) {
    if (state[skill].comparison) {
      return state[skill].comparison;
    }
    const top = benchmarks[skill].top.slice();
    const extras = shuffle(benchmarks[skill].pool.slice()).slice(0, Math.min(2, benchmarks[skill].pool.length));
    state[skill].comparison = top.concat(extras);
    return state[skill].comparison;
  }

  function updateScoreboard(skill, elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const record = state[skill];
    const comparison = pickComparison(skill);
    const parts = [];

    parts.push('<h5 class="title is-6">How you compare</h5>');

    let userPercent = null;
    if (record.total === 0) {
      parts.push('<p class="score-user-summary">Answer to track your accuracy.</p>');
    } else {
      userPercent = Math.round((record.correct / record.total) * 100);
    }

    const rows = [];

    function buildRow(label, percent, extra) {
      const clipped = Math.max(0, Math.min(100, percent || 0));
      const remaining = Math.max(0, 100 - clipped);
      return (
        '<div class="score-row">' +
          '<div class="score-row-header">' +
            '<span class="score-row-label">' + label + '</span>' +
            '<span class="score-row-value">' + (extra ? extra + ' ' : '') + formatScore(clipped) + '</span>' +
          '</div>' +
          '<div class="score-bar">' +
            '<div class="score-bar-green" style="width:' + clipped + '%"></div>' +
            '<div class="score-bar-red" style="width:' + remaining + '%"></div>' +
          '</div>' +
        '</div>'
      );
    }

    if (userPercent !== null) {
      rows.push(buildRow('You', userPercent, record.correct + '/' + record.total));
    }

    comparison.forEach(function(model) {
      rows.push(buildRow(model.name, model.score));
    });

    parts.push('<div class="model-scores">' + rows.join('') + '</div>');

    container.innerHTML = parts.join('');
  }

  function chooseEntry(list, currentId) {
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    let entry = list[Math.floor(Math.random() * list.length)];
    let guard = 0;
    while (entry.id === currentId && guard < 10) {
      entry = list[Math.floor(Math.random() * list.length)];
      guard += 1;
    }
    return entry;
  }

  /* ------------------------- Object Re-Identification -------------------- */
  function resetObjectReidUI() {
    const feedback = document.getElementById('reid-feedback');
    if (feedback) {
      feedback.textContent = 'Select an answer to see how you compare.';
      feedback.classList.remove('is-success', 'is-danger');
    }
    const explanation = document.getElementById('reid-explanation');
    if (explanation) {
      explanation.classList.add('is-hidden');
      explanation.innerHTML = '';
    }
    ['reid-yes', 'reid-no'].forEach(function(id) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-disabled', 'is-correct', 'is-wrong');
      }
    });
  }

  function buildObjectReidExplanation(meta) {
    const pieces = (meta.shapes || []).map(function(shape) {
      return (shape.color || 'colored') + ' ' + (shape.type || 'shape');
    });
    const partsSentence = pieces.length ? 'The object combines ' + listToEnglish(pieces) + '.' : '';
    const truth = (meta.truth || '').toLowerCase();
    if (truth === 'yes') {
      return '<p>' + partsSentence + '</p><p>In Image 2 those pieces stay locked together. Extra shapes are distractors, so the answer is <strong>Yes</strong>.</p>';
    }
    const jit = (meta.jit_attrs || []).map(function(shape) {
      return (shape.color || 'colored') + ' ' + (shape.type || 'shape');
    });
    const changeSentence = jit.length
      ? 'Image 2 nudges the ' + listToEnglish(jit) + ' away from the rest, breaking the match.'
      : 'Image 2 changes the arrangement, so the object is no longer identical.';
    return '<p>' + partsSentence + '</p><p>' + changeSentence + ' The correct answer is <strong>No</strong>.</p>';
  }

  function loadObjectReidExample(forceNew) {
    const list = manifests.objectReid;
    if (!list || !list.length) return;
    const img1 = document.getElementById('reid-image-1');
    const img2 = document.getElementById('reid-image-2');
    const currentId = forceNew && state.objectReid.current ? state.objectReid.current.entryId : null;
    const entry = chooseEntry(list, currentId);
    if (!entry) return;

    const hadCurrent = !!state.objectReid.current;
    fetchJSON(entry.meta).then(function(meta) {
      state.objectReid.current = {
        entryId: entry.id,
        meta: meta,
        answered: false
      };
      if (hadCurrent) {
        [img1, img2].forEach(function(img) {
          if (img) img.classList.add('is-fading');
        });
      }
      setImageWithFade(img1, entry.image1);
      setImageWithFade(img2, entry.image2);
      resetObjectReidUI();
      updateScoreboard('objectReid', 'reid-scoreboard');
    }).catch(function(err) {
      console.error('Failed to load object re-id example', err);
    });
  }

  function handleObjectReidAnswer(choice, button) {
    const current = state.objectReid.current;
    if (!current || current.answered) return;

    const truth = (current.meta.truth || '').toLowerCase();
    const isCorrect = choice === truth;

    state.objectReid.total += 1;
    if (isCorrect) {
      state.objectReid.correct += 1;
    }
    current.answered = true;

    const feedback = document.getElementById('reid-feedback');
    if (feedback) {
      feedback.classList.remove('is-success', 'is-danger');
      const correctWord = truth === 'yes' ? 'Yes' : 'No';
      if (isCorrect) {
        if (truth === 'yes') {
          feedback.textContent = 'Nice! The composite still matches Image 2.';
        } else {
          feedback.textContent = 'Nice catch! Image 2 does not contain the original object.';
        }
        feedback.classList.add('is-success');
      } else {
        feedback.textContent = 'Not quite. The correct answer is ' + correctWord + ' because one piece moves relative to the rest.';
        feedback.classList.add('is-danger');
      }
    }

    ['reid-yes', 'reid-no'].forEach(function(id) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('is-disabled');
        if (btn === button) {
          btn.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        }
      }
    });

    const explanation = document.getElementById('reid-explanation');
    if (explanation) {
      explanation.innerHTML = buildObjectReidExplanation(current.meta);
      explanation.classList.remove('is-hidden');
    }

    updateScoreboard('objectReid', 'reid-scoreboard');
  }

  /* ----------------------------- Scavenger ------------------------------- */
  function resetScavengerUI() {
    const feedback = document.getElementById('scavenger-feedback');
    if (feedback) {
      feedback.textContent = 'Select the color you land on after three hops.';
      feedback.classList.remove('is-success', 'is-danger');
    }
    const explanation = document.getElementById('scavenger-explanation');
    if (explanation) {
      explanation.classList.add('is-hidden');
      explanation.innerHTML = '';
    }
    const overlay = document.getElementById('scavenger-overlay');
    if (overlay) {
      overlay.innerHTML = '';
    }
  }

  function loadScavengerExample(forceNew) {
    const list = manifests.scavenger;
    if (!list || !list.length) return;
    const currentId = forceNew && state.scavenger.current ? state.scavenger.current.entryId : null;
    const entry = chooseEntry(list, currentId);
    if (!entry) return;

    const hadCurrent = !!state.scavenger.current;
    fetchJSON(entry.meta).then(function(meta) {
      state.scavenger.current = {
        entryId: entry.id,
        meta: meta,
        answered: false
      };
      const board = document.getElementById('scavenger-image');
      if (hadCurrent && board) {
        board.classList.add('is-fading');
      }
      if (board) {
        setImageWithFade(board, entry.board);
      }

      const prompt = document.getElementById('scavenger-prompt');
      if (prompt) {
        const start = meta.start_pair || [];
        const steps = Math.max((meta.chain || []).length - 1, 1);
        const shape = start[0] || 'shape';
        const color = start[1] || 'color';
        prompt.textContent = 'Start on the ' + color + ' ' + shape + ' and follow ' + steps + ' label hops. What color do you reach?';
      }

      const optionsEl = document.getElementById('scavenger-options');
      if (optionsEl) {
        optionsEl.innerHTML = '';
        Object.keys(meta.color_counts || {}).sort().forEach(function(color) {
          const btn = document.createElement('button');
          btn.className = 'button is-medium is-light';
          btn.dataset.color = color;
          btn.textContent = capitalize(color);
          btn.addEventListener('click', function() {
            handleScavengerAnswer(color, btn);
          });
          optionsEl.appendChild(btn);
        });
      }

      resetScavengerUI();
      updateScoreboard('scavenger', 'scavenger-scoreboard');
    }).catch(function(err) {
      console.error('Failed to load scavenger example', err);
    });
  }

  function buildScavengerExplanation(meta) {
    const chain = meta.chain || [];
    if (!chain.length) return '';
    const steps = chain.map(function(pair, idx) {
      const shape = pair[0];
      const color = pair[1];
      if (idx === 0) {
        return '<li>Start on the <strong>' + color + ' ' + shape + '</strong>.</li>';
      }
      if (idx === chain.length - 1) {
        return '<li>Finish on the <strong>' + color + ' ' + shape + '</strong>.</li>';
      }
      return '<li>Hop to the <strong>' + color + ' ' + shape + '</strong>.</li>';
    });
    return '<ol>' + steps.join('') + '</ol>';
  }

  function handleScavengerAnswer(color, button) {
    const current = state.scavenger.current;
    if (!current || current.answered) return;

    const meta = current.meta;
    const finalColor = (meta.final_color || '').toLowerCase();
    const isCorrect = color.toLowerCase() === finalColor;

    state.scavenger.total += 1;
    if (isCorrect) {
      state.scavenger.correct += 1;
    }
    current.answered = true;

    const feedback = document.getElementById('scavenger-feedback');
    if (feedback) {
      feedback.classList.remove('is-success', 'is-danger');
      if (isCorrect) {
        feedback.textContent = 'Nice tracking! The trail ends on ' + capitalize(finalColor) + '.';
        feedback.classList.add('is-success');
      } else {
        feedback.textContent = 'Close, but the trail ends on ' + capitalize(finalColor) + '.';
        feedback.classList.add('is-danger');
      }
    }

    const optionsEl = document.getElementById('scavenger-options');
    if (optionsEl) {
      optionsEl.querySelectorAll('button').forEach(function(btn) {
        btn.disabled = true;
        btn.classList.add('is-disabled');
        if (btn === button) {
          btn.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        }
      });
    }

    const explanation = document.getElementById('scavenger-explanation');
    if (explanation) {
      explanation.innerHTML = buildScavengerExplanation(meta);
      explanation.classList.remove('is-hidden');
    }

    updateScoreboard('scavenger', 'scavenger-scoreboard');
  }

  /* ------------------------------ Circuits -------------------------------- */
  function resetCircuitUI() {
    const feedback = document.getElementById('circuit-feedback');
    if (feedback) {
      feedback.textContent = 'Pick the component label you believe the wire reaches.';
      feedback.classList.remove('is-success', 'is-danger');
    }
  }

  function loadCircuitExample(forceNew) {
    const list = manifests.circuit;
    if (!list || !list.length) return;
    const currentId = forceNew && state.circuit.current ? state.circuit.current.entryId : null;
    const entry = chooseEntry(list, currentId);
    if (!entry) return;

    const hadCurrent = !!state.circuit.current;
    fetchJSON(entry.meta).then(function(meta) {
      state.circuit.current = {
        entryId: entry.id,
        meta: meta,
        answered: false
      };
      const diagram = document.getElementById('circuit-image');
      if (hadCurrent && diagram) {
        diagram.classList.add('is-fading');
      }
      if (diagram) {
        setImageWithFade(diagram, entry.diagram);
      }

      const prompt = document.getElementById('circuit-prompt');
      if (prompt) {
        prompt.textContent = 'Follow the wire leaving port ' + meta.query_port + ' on the breadboard. Where does it terminate?';
      }

      const optionsEl = document.getElementById('circuit-options');
      if (optionsEl) {
        optionsEl.innerHTML = '';
        const uniqueComponents = Array.from(new Set(Object.values(meta.mapping || {}))).sort();
        uniqueComponents.forEach(function(comp) {
          const btn = document.createElement('button');
          btn.className = 'button is-medium is-light';
          btn.dataset.component = comp;
          btn.textContent = comp;
          btn.style.margin = '0.25rem';
          btn.addEventListener('click', function() {
            handleCircuitAnswer(comp, btn);
          });
          optionsEl.appendChild(btn);
        });
      }

      resetCircuitUI();
      updateScoreboard('circuit', 'circuit-scoreboard');
    }).catch(function(err) {
      console.error('Failed to load circuit example', err);
    });
  }

  function handleCircuitAnswer(component, button) {
    const current = state.circuit.current;
    if (!current || current.answered) return;

    const meta = current.meta;
    const correct = (meta.correct_comp || '').toUpperCase();
    const isCorrect = component.toUpperCase() === correct;

    state.circuit.total += 1;
    if (isCorrect) {
      state.circuit.correct += 1;
    }
    current.answered = true;

    const feedback = document.getElementById('circuit-feedback');
    if (feedback) {
      feedback.classList.remove('is-success', 'is-danger');
      if (isCorrect) {
        feedback.textContent = 'Correct! Port ' + meta.query_port + ' connects to ' + correct + '.';
        feedback.classList.add('is-success');
      } else {
        feedback.textContent = 'Not this time. The wire from port ' + meta.query_port + ' ends at ' + correct + '.';
        feedback.classList.add('is-danger');
      }
    }

    const optionsEl = document.getElementById('circuit-options');
    if (optionsEl) {
      optionsEl.querySelectorAll('button').forEach(function(btn) {
        btn.disabled = true;
        btn.classList.add('is-disabled');
        if (btn === button) {
          btn.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        }
      });
    }

    updateScoreboard('circuit', 'circuit-scoreboard');
  }

  /* ----------------------------- Initialization -------------------------- */
  function initialize() {
    updateScoreboard('objectReid', 'reid-scoreboard');
    updateScoreboard('scavenger', 'scavenger-scoreboard');
    updateScoreboard('circuit', 'circuit-scoreboard');

    loadObjectReidExample(false);
    loadScavengerExample(false);
    loadCircuitExample(false);

    const yesBtn = document.getElementById('reid-yes');
    const noBtn = document.getElementById('reid-no');
    if (yesBtn) {
      yesBtn.addEventListener('click', function() {
        handleObjectReidAnswer('yes', yesBtn);
      });
    }
    if (noBtn) {
      noBtn.addEventListener('click', function() {
        handleObjectReidAnswer('no', noBtn);
      });
    }

    const nextReid = document.getElementById('reid-next');
    if (nextReid) {
      nextReid.addEventListener('click', function() {
        loadObjectReidExample(true);
      });
    }

    const nextScavenger = document.getElementById('scavenger-next');
    if (nextScavenger) {
      nextScavenger.addEventListener('click', function() {
        loadScavengerExample(true);
      });
    }

    const nextCircuit = document.getElementById('circuit-next');
    if (nextCircuit) {
      nextCircuit.addEventListener('click', function() {
        loadCircuitExample(true);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    Promise.all([
      fetchJSON('static/data/vlmtunnel/object_reid_manifest.json'),
      fetchJSON('static/data/vlmtunnel/visual_scavenger_manifest.json'),
      fetchJSON('static/data/vlmtunnel/circuits_manifest.json')
    ]).then(function(results) {
      manifests.objectReid = results[0];
      manifests.scavenger = results[1];
      manifests.circuit = results[2];
      initialize();
    }).catch(function(err) {
      console.error('Failed to initialize interactive demos', err);
    });
  });
})();
