'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * New webpack 4 API,
 * for webpack 2-3 compatibility used .plugin('...', cb)
 */
function unCamelCase(str) {
  return str.replace(/[A-Z]/g, function (letter) {
    return '-' + letter.toLowerCase();
  });
}

function pluginCompatibility(caller, hook, cb) {
  if (caller.hooks) {
    caller.hooks[hook].tap('webpack-file-list-plugin', cb);
  } else {
    caller.plugin(unCamelCase(hook), cb);
  }
}

function WebpackFileList(options) {
  if (!options.filename) {
    throw new Error("filename property is required on options");
  } else if (!options.path) {
    throw new Error("path property is required on options");
  }

  this.options = options;
}

WebpackFileList.prototype.applyPriorities = function (result) {
  if (!this.options.priorities) {
    return;
  }

  var priorityCount = 0;
  this.options.priorities.forEach(function (p) {
    var resultEntry = result[p];
    if (!resultEntry) {
      return;
    }

    resultEntry.priority = priorityCount;
    priorityCount++;
  });
};

WebpackFileList.prototype.apply = function (compiler) {
  var _this = this;

  pluginCompatibility(compiler, 'emit', function (compilation, callback) {
    var json = {};
    compilation.chunks.forEach(function (chunk) {
      chunk.files.forEach(function (filename) {
        var ref = json[chunk.name];
        if (ref === undefined) {
          ref = {};
          json[chunk.name] = ref;
        }

        if (filename.endsWith('css')) {
          ref.css = filename;
        } else if (filename.endsWith('css.map') && _this.options.includeMap) {
          ref.cssMap = filename;
        } else if (filename.endsWith('js')) {
          ref.source = filename;
        } else if (filename.endsWith('js.map') && _this.options.includeMap) {
          ref.sourceMap = filename;
        }
      });
    });

    // Apply priorities
    _this.applyPriorities(json);

    // Write out JSON
    var destination = _path2.default.join(_this.options.path, _this.options.filename);
    var blob = JSON.stringify(json, undefined, 2);
    var buffer = new Buffer(blob);

    var mode = 0x1a4;
    _fs2.default.open(destination, 'w', mode, function (openErr, fd) {
      if (openErr) {
        console.error('Failed to open file \'' + destination + '\' with error \'' + openErr.toString() + '\'; quitting.');
        callback();
        return;
      }

      _fs2.default.write(fd, buffer, 0, buffer.length, 0, function (writeErr) {
        if (writeErr) {
          console.error('Failed to write file \'' + destination + '\' with error \'' + writeErr.toString() + '\'; quitting.');
          callback();
          return;
        }

        _fs2.default.close(fd, function (closeErr) {
          if (closeErr) {
            console.warn('Failed to close file \'' + destination + '\' with error \'' + closeErr.toString() + '\'.');
          }

          callback();
        });
      });
    });
  });
};

module.exports = WebpackFileList;