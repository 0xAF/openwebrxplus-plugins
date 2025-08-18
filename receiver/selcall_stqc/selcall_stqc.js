/*
 * STQC SelCall plugin for OpenWebRx+
 * This plugin adds STQC (Polish firefighters) selcall decoding to OpenWebRX+
 */

// Initialize the plugin object
Plugins.selcall_stqc = {};

// Set plugin version
Plugins.selcall_stqc._version = 0.1;

// Init function of the plugin
Plugins.selcall_stqc.init = function () {
  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.1)) {
    console.error('SelCall STQC plugin depends on "utils >= 0.1".');
    return false;
  }

  // Listen for WebSocket messages to intercept and enhance SELCALL data
  Plugins.utils.wrap_func(
    'ws_onmessage',
    function (orig, thisArg, args) {
      try {
        // Get the message data
        const msg = JSON.parse(args[0].data);
        
        // Check if this is a SELCALL message
        if (msg.type === 'SELCALL') {
          // Look for STQC patterns in the message
          const stqcPattern = /([0-9]{5,6})/g;
          const matches = msg.value.match(stqcPattern);
          
          if (matches && matches.length > 0) {
            // Process STQC codes
            for (let i = 0; i < matches.length; i++) {
              const code = matches[i];
              // Check if it's a valid STQC code (5-6 digits)
              if (code.length >= 5 && code.length <= 6) {
                // Decode STQC information
                const stqcInfo = Plugins.selcall_stqc.decodeSTQC(code);
                
                // If we have valid STQC information, add it to the message
                if (stqcInfo) {
                  // Add STQC information to the message with styling
                  msg.value += " <span class='stqc-info'>[STQC: " + stqcInfo + "]</span>";
                }
              }
            }
            
            // Replace the original message with our enhanced version
            args[0].data = JSON.stringify(msg);
          }
        }
      } catch (e) {
        // Error handling - just log and continue with original function
        console.error('Error in STQC plugin:', e);
      }
      
      // Always call the original function
      return true;
    },
    function (res) {
      // After callback - nothing to do here
    }
  );

  // Return true to indicate successful initialization
  return true;
};

// STQC decoder function
Plugins.selcall_stqc.decodeSTQC = function(code) {
  // Polish firefighters STQC code interpretation
  // Format is typically 5-6 digits
  
  let result = '';
  
  // Different formats based on code length
  if (code.length === 5) {
    // 5-digit format: AABBC
    // AA = Unit type (10-99)
    // BB = Unit number (01-99)
    // C = Subunit or function (0-9)
    
    const unitType = code.substring(0, 2);
    const unitNumber = code.substring(2, 4);
    const subunit = code.substring(4, 5);
    
    // Decode unit type
    let unitTypeDesc = 'Unknown';
    if (unitType >= '10' && unitType <= '19') unitTypeDesc = 'Command vehicle';
    else if (unitType >= '20' && unitType <= '29') unitTypeDesc = 'Fire engine';
    else if (unitType >= '30' && unitType <= '39') unitTypeDesc = 'Water tanker';
    else if (unitType >= '40' && unitType <= '49') unitTypeDesc = 'Ladder truck';
    else if (unitType >= '50' && unitType <= '59') unitTypeDesc = 'Rescue vehicle';
    else if (unitType >= '60' && unitType <= '69') unitTypeDesc = 'Special vehicle';
    else if (unitType >= '70' && unitType <= '79') unitTypeDesc = 'Support vehicle';
    else if (unitType >= '80' && unitType <= '89') unitTypeDesc = 'Medical unit';
    else if (unitType >= '90' && unitType <= '99') unitTypeDesc = 'Command center';
    
    // Decode subunit function
    let subunitDesc = '';
    switch (subunit) {
      case '0': subunitDesc = 'Main unit'; break;
      case '1': subunitDesc = 'Subunit 1'; break;
      case '2': subunitDesc = 'Subunit 2'; break;
      case '3': subunitDesc = 'Subunit 3'; break;
      case '4': subunitDesc = 'Subunit 4'; break;
      case '5': subunitDesc = 'Command'; break;
      case '6': subunitDesc = 'Special team'; break;
      case '7': subunitDesc = 'Support team'; break;
      case '8': subunitDesc = 'Reserve'; break;
      case '9': subunitDesc = 'All units'; break;
      default: subunitDesc = 'Unknown';
    }
    
    result = unitTypeDesc + ' #' + unitNumber + ' (' + subunitDesc + ')';
  } 
  else if (code.length === 6) {
    // 6-digit format: AABBCC
    // AA = Region code (01-99)
    // BB = District code (01-99)
    // CC = Station code (01-99)
    
    const regionCode = code.substring(0, 2);
    const districtCode = code.substring(2, 4);
    const stationCode = code.substring(4, 6);
    
    // Polish region codes (voivodeships)
    let regionName = 'Unknown';
    switch (regionCode) {
      case '01': regionName = 'Dolnośląskie'; break;
      case '02': regionName = 'Kujawsko-Pomorskie'; break;
      case '03': regionName = 'Lubelskie'; break;
      case '04': regionName = 'Lubuskie'; break;
      case '05': regionName = 'Łódzkie'; break;
      case '06': regionName = 'Małopolskie'; break;
      case '07': regionName = 'Mazowieckie'; break;
      case '08': regionName = 'Opolskie'; break;
      case '09': regionName = 'Podkarpackie'; break;
      case '10': regionName = 'Podlaskie'; break;
      case '11': regionName = 'Pomorskie'; break;
      case '12': regionName = 'Śląskie'; break;
      case '13': regionName = 'Świętokrzyskie'; break;
      case '14': regionName = 'Warmińsko-Mazurskie'; break;
      case '15': regionName = 'Wielkopolskie'; break;
      case '16': regionName = 'Zachodniopomorskie'; break;
      default: regionName = 'Region ' + regionCode;
    }
    
    result = regionName + ', District ' + districtCode + ', Station ' + stationCode;
  }
  
  return result || 'Unknown format';
};