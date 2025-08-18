/*
 * TETRA Decoder Plugin Initialization
 * 
 * This file handles the loading and initialization of the TETRA decoder plugin.
 * It ensures all dependencies are loaded and the plugin is properly registered.
 */

// Plugin configuration
Plugins.tetra_decoder = {
    // Plugin metadata
    name: 'TETRA Decoder',
    version: '1.0.0',
    description: 'Advanced TETRA demodulation and decoding with visual feedback',
    author: 'OpenWebRX+ Community',
    
    // Plugin dependencies
    dependencies: {
        utils: '0.1'
    },
    
    // Plugin initialization function
    init: async function() {
        console.log('Loading TETRA Decoder plugin...');
        
        try {
            // Load CSS styles
            await Plugins._load_style(Plugins._get_plugin_path('receiver/tetra_decoder') + '/tetra_decoder.css');
            console.log('TETRA Decoder: CSS loaded successfully');
            
            // Load main plugin script
            await Plugins._load_script(Plugins._get_plugin_path('receiver/tetra_decoder') + '/tetra_decoder.js');
            console.log('TETRA Decoder: Main script loaded successfully');
            
            // Initialize the plugin
            if (typeof Plugins.tetra_decoder.init === 'function') {
                const initResult = Plugins.tetra_decoder.init();
                if (initResult) {
                    console.log('TETRA Decoder plugin initialized successfully');
                    
                    // Register plugin for features page
                    if (typeof Plugins._registerFeature === 'function') {
                        Plugins._registerFeature('tetra_decoder', Plugins.tetra_decoder.getFeatureInfo());
                    }
                    
                    return true;
                } else {
                    console.error('TETRA Decoder plugin initialization failed');
                    return false;
                }
            } else {
                console.error('TETRA Decoder plugin init function not found');
                return false;
            }
            
        } catch (error) {
            console.error('Error loading TETRA Decoder plugin:', error);
            return false;
        }
    },
    
    // Plugin cleanup function
    cleanup: function() {
        if (typeof Plugins.tetra_decoder.cleanup === 'function') {
            Plugins.tetra_decoder.cleanup();
        }
        console.log('TETRA Decoder plugin cleaned up');
    }
};

// Auto-initialize if OpenWebRX is already loaded
if (typeof $ !== 'undefined' && $(document).ready) {
    $(document).ready(function() {
        // Small delay to ensure other plugins are loaded
        setTimeout(function() {
            if (typeof Plugins.tetra_decoder.init === 'function') {
                Plugins.tetra_decoder.init();
            }
        }, 500);
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Plugins.tetra_decoder;
}