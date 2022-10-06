# Blazor devtools

This package attempts to help you find bad renderers and improve the performance of your blazor app, [until (or if) Microsoft gives us an official solution](https://github.com/dotnet/razor-tooling/issues/4613).


> 📣 *If you have used this package and has helped you improve your app but feel like it should have more features, please consider creating an issue.*

## What does this package do ?
This package just provides a new webassembly file to use:
1. Exposes the browser renderer used by Blazor to track components.
2. Intercepts all calls from .net to render.
3. Draws a border around every element that is rendered on a canvas. (Just like the standard React Devtools)
4. The border color is by default `#f0f0f0` and grows warmer the more frequently the element is rerendered.

## How to use
1. Add the nuget package in your **Client** (wasm) project.
```
dotnet add package BlazorDevtools
``` 
2. That's it. Run the app you will see every render of a component be outlined!

*Nuget package page can be found [here](https://www.nuget.org/packages/BlazorDevtools/).*

## Samples / Demo
TODO!
<!-- You can find a sample app using this package [here](TODO).  -->