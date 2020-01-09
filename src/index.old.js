import xml2js from 'xml2js'
import fs from 'fs'
import _ from 'lodash'

const parser = new xml2js.Parser()

const inputPath = __dirname + '/../input/strings.xml'
const inputSourceJSONPath = __dirname + '/../input/source.json'

const outputStringsPath = __dirname + '/../output/localized.strings'
const outputJSONPath = __dirname + '/../output/localized.json'
const outputSourceJSONPath = __dirname + '/../output/source.json'
const outputLocalizedStringsPath = lang => __dirname + `/../output/localized.${lang}.strings`
const outputSwiftPath = __dirname + '/../output/LocalizedStrings.swift'



function extractResourcesString() {
	fs.readFile(inputPath, 'utf8', function (err, data) {
		parser.parseString(data, function (err, result) {
			const { resources } = result
			const stringsArray = resources['string-array']
			const strings = stringsArray.map(parseStrings)
			const stringArray = resources.string
			const string = stringArray.map(parseString)
			const resultsArray = [...string, ...strings.map(flattenStrings)]
			const results = resultsArray.reduce((acc, el) => `${acc}${localizedString(el)};\n\n`, '')
			// console.log(results);

			fs.writeFile(outputStringsPath, results, err => {
				// throws an error, you could also catch it here
				if (err) throw err
				// success case, the file was saved
				console.log('output saved!')
			})
		});
	});
}

function extractResourcesJSON() {
	fs.readFile(inputPath, 'utf8', function (err, data) {
		parser.parseString(data, function (err, result) {
			const { resources } = result
			const stringsArray = resources['string-array']
			const strings = stringsArray.map(parseStrings)
			const stringArray = resources.string
			const string = stringArray.map(parseString)
			const resultsArray = [...string, ...strings.map(flattenStrings)]
			fs.writeFile(outputJSONPath, JSON.stringify(resultsArray, null, 2), err => {
				// throws an error, you could also catch it here
				if (err) throw err
				// success case, the file was saved
				console.log('json saved!')
			})
		});
	});
}

function extractToSourceJSON() {
	fs.readFile(inputPath, 'utf8', function (err, data) {
		parser.parseString(data, function (err, result) {
			const { resources } = result
			const stringsArray = resources['string-array']
			const strings = stringsArray.map(parseStrings)
			const stringArray = resources.string
			const string = stringArray.map(parseString)
			const resultsArray = [...string, ...strings.map(flattenStrings)]
			const en = jsonToSourceJSON(resultsArray, 'en')
			const ar = jsonToSourceJSON(resultsArray, 'ar')
			const res = mergeDeep(en, ar)
			fs.writeFile(outputSourceJSONPath, JSON.stringify(res, null, 2), err => {
				// throws an error, you could also catch it here
				if (err) throw err
				// success case, the file was saved
				console.log('json saved!')
			})
		});
	});
}

function extractFromSourceJSON() {
	fs.readFile(inputSourceJSONPath, 'utf8', function (err, data) {
		const sourceJSON = JSON.parse(data)
		const results = {}
		let keys = new Set()
		Object.entries(sourceJSON).forEach(([name, values]) => {
			Object.entries(values).forEach(([lang, value]) => {
				const obj = { name, value }
				if (results[lang]) {
					results[lang].push(obj)
				} else {
					results[lang] = [obj]
				}
				keys.add(name)
			})
		})
		Object.entries(results).forEach(([lang, values]) => {
			const content = values.reduce((acc, el) => `${acc}${localizedString(el)};\n\n`, '')
			fs.writeFile(outputLocalizedStringsPath(lang), content, err => {
				// throws an error, you could also catch it here
				if (err) throw err
				// success case, the file was saved
				console.log(`localized lang ${lang} saved!`)
			})
		})
		keys = [...keys]
			.map(localizedFunction)
			.reduce((acc, el) => `${acc}${el}\n\n`, '')
		console.log('keys:', keys);

		fs.writeFile(outputSwiftPath, keys, err => {
			// throws an error, you could also catch it here
			if (err) throw err
			// success case, the file was saved
			console.log('swift saved!')
		})
	});
}

function localizedFunction(key) {
	const res = `\
static func ${_.camelCase(key)}() -> String {
	return NSLocalizedString("${key}", comment: "")
}`
	console.log(res);

	return res
}

function parseStrings(source) {
	const { $: { name }, item: items } = source
	return { name, items }
}

function parseString(source) {
	const { _: value, $: { name } } = source
	return { name, value }
}

function flattenStrings(source) {
	const { name, items } = source
	return {
		name,
		value: items.reduce((acc, el) => `${acc}<item>${el}</item>`, '')
	}
}

function localizedString(source) {
	const { name, value } = source
	const val = value
		.replace(/[\""]/g, '\\"') // escape "
	return `"${name}" = "${val}"`
}

function jsonToSourceJSON(source, lang) {
	let result = {}
	source.forEach(({ name, value }) => {
		result[name] = { [lang]: value }
	})
	return result
}

function mergeDeep(a, b) {
	Object.entries(b).forEach(([key, obj]) => {
		Object.entries(obj).forEach(([lang, value]) => {
			a[key][lang] = value
		})
	})
	return a
}

// extractResourcesString()
// extractResourcesJSON()
// extractToSourceJSON()
extractFromSourceJSON()
