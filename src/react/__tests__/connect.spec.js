import React from 'react';
import { Machine } from '../../';
import connect from '../connect';
import { mount } from 'enzyme';

var wrapper;
const mapping = sinon.spy();

function getWrapper(once, m) {
  class Component extends React.Component {
    render() {
      return (
        <div>
          <p id='A'>{ this.props.message('machine A', this.props.stateA)}</p>
          <p id='B'>{ this.props.message('machine B', this.props.stateB)}</p>
          <button id='run' onClick={ () => this.props.run() }>run</button>
          <button id='fetch' onClick={ () => this.props.fetch() }>fetch</button>
        </div>
      );
    }
  }

  const mappingFunc = (A, B) => {
    mapping(A, B);
    return {
      stateA: A.state.name,
      stateB: B.state.name,
      run: A.run,
      fetch: B.fetch
    }
  };
  const ConnectedComponent = connect(Component)
    .with('A', 'B')
    [once ? 'mapOnce' : 'map'](typeof m === 'undefined' ? mappingFunc : m);
  const message = (machineName, state) => `${ machineName } is in a ${ state } state`;
  
  return mount(<ConnectedComponent message={ message } />);
}

describe('Given the connect React helper', function () {
  beforeEach(() => {
    mapping.reset();
    Machine.flush();
    Machine.create('A', {
      state: { name: 'idle' },
      transitions: {
        idle: { run: 'running' },
        running: { stop: 'idle' }
      }
    });
    Machine.create('B', {
      state: { name: 'waiting' },
      transitions: {
        waiting: { fetch: 'fetching' },
        fetching: { done: 'waiting' }
      }
    });
    wrapper = getWrapper();
  });
  describe('when connecting a component', function () {
    it('should call our mapping function', function () {
      expect(mapping).to.be.calledOnce;
    });
    it('should map machines state and actions properly', function () {
      expect(wrapper.find('p#A').text()).to.equal('machine A is in a idle state');
      expect(wrapper.find('p#B').text()).to.equal('machine B is in a waiting state');
    });
    it('should get re-rendered if a machine\'s state is changed', function () {
      const runButton = wrapper.find('button#run');
      const fetchButton = wrapper.find('button#fetch');

      expect(wrapper.find('p#A').text()).to.equal('machine A is in a idle state');
      runButton.simulate('click');
      expect(wrapper.find('p#A').text()).to.equal('machine A is in a running state');
      runButton.simulate('click');
      runButton.simulate('click');
      runButton.simulate('click');

      fetchButton.simulate('click');
      expect(wrapper.find('p#B').text()).to.equal('machine B is in a fetching state');
    });
    it('should NOT get re-rendered if mapped with `mapOnce`', function () {
      wrapper = getWrapper(true);
      wrapper.find('button#run').simulate('click');
      wrapper.find('button#fetch').simulate('click');
      expect(wrapper.find('p#A').text()).to.equal('machine A is in a idle state');
      expect(wrapper.find('p#B').text()).to.equal('machine B is in a waiting state');
    });
  });
  describe('when unmounting the component', function () {
    it('should detach from the machines', function () {
      Machine.get('A').run();
      expect(wrapper.find('p#A').text()).to.equal('machine A is in a running state');
      Machine.get('A').stop();
      expect(wrapper.find('p#A').text()).to.equal('machine A is in a idle state');
      wrapper.unmount();
      Machine.get('A').run();
      expect(mapping.callCount).to.be.equal(3);
    });
  });
  describe('when we connect without mapping', function () {
    it('should detach from the machines', function () {
      class Component extends React.Component {
        constructor(props) {
          super(props);

          this.counter = 0;
        }
        render() {
          this.counter += 1;
          return <p>Rendered { this.counter } times</p>;
        }
      }
      const Connected = connect(Component).with('A', 'B').map();
      const connectedWrapper = mount(<Connected />);
      Machine.get('A').run();
      Machine.get('A').stop();
      // 1 - initial render
      // 2 - default mapping call
      // 3 - because of machine's action run
      // 4 - because of machine's action stop 
      expect(connectedWrapper.find('p').text()).to.equal('Rendered 4 times');
    });
  });
  describe('when we use mapSilent', function () {
    it('should only call the mapping function when the machine changes its state', function () {
      class Component extends React.Component {
        constructor(props) {
          super(props);
          
          this.counter = 0;
        }
        render() {
          this.counter += 1;
          return (
            <div>
              <p id='A'>{ this.props.message('machine A', this.props.stateA)}</p>
              <p id='counter'>Rendered { this.counter } times</p>
            </div>
          );
        }
      }
      const message = (machineName, state) => `${ machineName } is in a ${ state } state`;
      const Connected = connect(Component).with('A', 'B').mapSilent(A => {
        return {
          stateA: A.state.name
        }
      });
      const connectedWrapper = mount(<Connected message={ message }/>);
      expect(connectedWrapper.find('p#A').text()).to.equal('machine A is in a undefined state');
      Machine.get('A').run();
      expect(connectedWrapper.find('p#A').text()).to.equal('machine A is in a running state');
      // 1 - initial render
      // 2 - because of machine's action run
      expect(connectedWrapper.find('p#counter').text()).to.equal('Rendered 2 times');
    });
  });
});