/* ========================================
   Module: Company Setup
   ======================================== */
(function () {
  'use strict';
  var P = window.PayrollApp;

  function stateCheckboxes() {
    var html = '<div class="checkbox-grid">';
    Object.keys(P.STATES).forEach(function (code) {
      html += '<label class="checkbox-label">' +
        '<input type="checkbox" name="reg-state" value="' + code + '"> ' +
        P.STATES[code] + ' (' + code + ')' +
      '</label>';
    });
    html += '</div>';
    return html;
  }

  window.PayrollModules.companySetup = {
    render: function () {
      return '' +
        '<div class="page-header">' +
          '<h3>Company Setup</h3>' +
          '<button class="btn btn-primary" id="btn-save-company">Save Changes</button>' +
        '</div>' +

        '<div class="card">' +
          '<h3 class="card-title">Company Profile</h3>' +
          '<form id="company-form" class="form-grid">' +
            '<div class="form-group">' +
              '<label class="form-label">Company Name</label>' +
              '<input type="text" class="form-input" id="co-name" placeholder="Enter company name">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">EIN (Tax ID)</label>' +
              '<input type="text" class="form-input" id="co-ein" placeholder="XX-XXXXXXX">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">Street Address</label>' +
              '<input type="text" class="form-input" id="co-address" placeholder="123 Main St">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">City</label>' +
              '<input type="text" class="form-input" id="co-city" placeholder="City">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">State</label>' +
              '<select class="form-input" id="co-state">' +
                '<option value="">Select state</option>' +
                Object.keys(P.STATES).map(function (c) {
                  return '<option value="' + c + '">' + P.STATES[c] + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">ZIP Code</label>' +
              '<input type="text" class="form-input" id="co-zip" placeholder="12345">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">Phone</label>' +
              '<input type="text" class="form-input" id="co-phone" placeholder="(555) 123-4567">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">Industry</label>' +
              '<input type="text" class="form-input" id="co-industry" placeholder="Technology, Healthcare, etc.">' +
            '</div>' +
          '</form>' +
        '</div>' +

        '<div class="card">' +
          '<h3 class="card-title">State Registrations</h3>' +
          '<p style="color:var(--color-gray-500);margin-bottom:var(--space-md)">Select all states where your company has employees or payroll tax obligations.</p>' +
          stateCheckboxes() +
        '</div>' +

        '<div class="card">' +
          '<h3 class="card-title">Work Locations</h3>' +
          '<div id="locations-list"></div>' +
          '<div style="margin-top:var(--space-md)">' +
            '<button class="btn btn-secondary" id="btn-add-location">+ Add Location</button>' +
          '</div>' +
        '</div>';
    },

    init: function () {
      var locations = [];

      // Load company data
      P.apiFetch('/company')
        .then(function (data) {
          if (!data) return;
          var el = function (id) { return document.getElementById(id); };
          if (data.name && el('co-name')) el('co-name').value = data.name;
          if (data.ein && el('co-ein')) el('co-ein').value = data.ein;
          if (data.address && el('co-address')) el('co-address').value = data.address;
          if (data.city && el('co-city')) el('co-city').value = data.city;
          if (data.state && el('co-state')) el('co-state').value = data.state;
          if (data.zip && el('co-zip')) el('co-zip').value = data.zip;
          if (data.phone && el('co-phone')) el('co-phone').value = data.phone;
          if (data.industry && el('co-industry')) el('co-industry').value = data.industry;

          // Check registered states
          if (data.registeredStates && Array.isArray(data.registeredStates)) {
            data.registeredStates.forEach(function (st) {
              var cb = document.querySelector('input[name="reg-state"][value="' + st + '"]');
              if (cb) cb.checked = true;
            });
          }

          // Load locations
          locations = data.locations || [];
          renderLocations();
        })
        .catch(function (err) {
          console.error('Company load error:', err);
        });

      function renderLocations() {
        var container = document.getElementById('locations-list');
        if (!container) return;
        if (!locations.length) {
          container.innerHTML = '<p class="empty-state">No work locations added yet.</p>';
          return;
        }
        container.innerHTML = locations.map(function (loc, i) {
          return '<div class="config-card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm)">' +
            '<div>' +
              '<strong>' + P.escapeHtml(loc.name || 'Location ' + (i + 1)) + '</strong>' +
              '<div style="color:var(--color-gray-500);font-size:var(--font-size-sm)">' +
                P.escapeHtml((loc.address || '') + ', ' + (loc.city || '') + ', ' + P.stateName(loc.state || '') + ' ' + (loc.zip || '')) +
              '</div>' +
            '</div>' +
            '<button class="btn btn-sm btn-danger" data-remove-loc="' + i + '">Remove</button>' +
          '</div>';
        }).join('');

        // Bind remove buttons
        container.querySelectorAll('[data-remove-loc]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            locations.splice(parseInt(btn.dataset.removeLoc), 1);
            renderLocations();
          });
        });
      }

      // Add location
      var addLocBtn = document.getElementById('btn-add-location');
      if (addLocBtn) {
        addLocBtn.addEventListener('click', function () {
          var name = prompt('Location name:');
          if (!name) return;
          var address = prompt('Street address:') || '';
          var city = prompt('City:') || '';
          var state = prompt('State code (e.g. CA, NY):') || '';
          var zip = prompt('ZIP code:') || '';
          locations.push({ name: name, address: address, city: city, state: state, zip: zip });
          renderLocations();
        });
      }

      // Save
      var saveBtn = document.getElementById('btn-save-company');
      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          var registeredStates = [];
          document.querySelectorAll('input[name="reg-state"]:checked').forEach(function (cb) {
            registeredStates.push(cb.value);
          });

          var payload = {
            name: document.getElementById('co-name').value.trim(),
            ein: document.getElementById('co-ein').value.trim(),
            address: document.getElementById('co-address').value.trim(),
            city: document.getElementById('co-city').value.trim(),
            state: document.getElementById('co-state').value,
            zip: document.getElementById('co-zip').value.trim(),
            phone: document.getElementById('co-phone').value.trim(),
            industry: document.getElementById('co-industry').value.trim(),
            registeredStates: registeredStates,
            locations: locations,
          };

          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';

          P.apiFetch('/company', { method: 'PUT', body: payload })
            .then(function () {
              P.showToast('Company settings saved successfully!', 'success');
            })
            .catch(function (err) {
              P.showToast('Failed to save: ' + err.message, 'error');
            })
            .finally(function () {
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save Changes';
            });
        });
      }
    }
  };
})();
