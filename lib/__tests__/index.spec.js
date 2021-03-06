'use strict';

var _ = require('../');

var _constants = require('../constants');

var create = function create() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'app';
  return _.Machine.create(name, {
    state: { idle: { run: 'running' } },
    transitions: {}
  });
};

describe('Given the Stent library', function () {
  beforeEach(function () {
    _.Machine.flush();
  });
  describe('when creating a new machine', function () {
    it('should have the machine with its name set up', function () {
      expect(create('foo').name).to.equal('foo');
    });
  });
  describe('when `get`ing a machine', function () {
    it('should return the machine if it exists', function () {
      create('bar');

      expect(_.Machine.get('bar').name).to.equal('bar');
    });
    it('should throw an error if the machine does not exist', function () {
      create('bar');

      expect(_.Machine.get.bind(_.Machine, 'baz')).to.throw((0, _constants.ERROR_MISSING_MACHINE)('baz'));
    });
  });
  describe('when creating a machine without a name', function () {
    it('should be possible to fetch it by using the machine itself or the its generated name', function () {
      var machine = _.Machine.create({
        state: { name: 'idle' },
        transitions: { idle: { run: 'running' } }
      });

      expect(_.Machine.get(machine).state.name).to.equal('idle');
      expect(_.Machine.get(machine.name).state.name).to.equal('idle');
    });
  });
});