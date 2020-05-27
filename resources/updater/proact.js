window.Proact = () => {

	const Proact = {};

	Proact.Component = class Component {

		props = {};
		state = {};
		children = {};
		el = null;

		constructor(props, children) {
			for (const key in props) {
				this.props[key] = props[key];
			}
			this.children = children || {};
		}

		render = () => console.error("Render method not implemented");
		_render = () => {
			const result = this.render();
		};

		shouldUpdate = () => true;
		didMount = () => {};
		willUnmount = () => {};
		willUpdate = (nextProps, nextState) => {};
		didUpdate = (prevProps, prevState) => {};
		
		setState = (newState) => {
			const s = {
				...this.state,
				...newState
			};
			// TODO: Marshall off to state management
		};

		_mount = (parentElement) => {
			
			this.didMount();
		};
		_unmount = () => {
			this.willUnmount();
		};

	};

	Proact.mount = (component, element) => {
		component
	};

	return Proact;

}