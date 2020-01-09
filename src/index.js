import fs from 'fs'
import _ from 'lodash'

const inputSourceJSONPath = __dirname + '/../input/newSource.json'

const outputLocalizedStringsPath = lang => __dirname + `/../output/localized.${lang}.strings`
const outputSwiftPath = __dirname + '/../output/LocalizedStrings.swift'

// interface StringVariable {
// 	name: String;
// 	type: String;
// }

// interface StringItem {
// 	key: String;
// 	type?: 'single' | 'array';
// 	comment?: String;
// 	variables?: StringVariable[];
// 	values: Object;
// }

function escape(string) {
	return string.replace(/[\""]/g, '\\"') // escape "
}

function toLocalizedString({ key, type = 'single', comment, values }, lang) {
	if (!values[lang]) {
		return ''
	}
	let value = ''
	if (type === 'single') {
		value = escape(values[lang])
	} else if (type === 'array') {
		value = values[lang].reduce((acc, el) => `${acc}<item>${escape(el)}</item>`, '')
	}
	let result = `"${key}" = "${value}";\n\n`
	if (!!comment) {
		result = `/* ${comment} */\n${result}`
	}
	return result
}

function toSwiftCode({ key, type = 'signle', comment = '', variables }) {
	const name = _.camelCase(key)
	let args = ''
	let vars = ''
	if (!!variables && variables.length > 0) {
		args = variables.reduce((acc, { name, type }) => `${acc}, ${name}: ${type}`, '')
		args = args.substr(2) // remove extra first ,
		vars = variables.reduce((acc, { name }) => `${acc},\n\t\t\t${name}`, '')
	}
	let result = ''
	if (type === 'signle') {
		result = `\
	static func ${name}(${args}) -> String {
		return String(
			format: NSLocalizedString(
				"${escape(key)}",
				comment: "${escape(comment)}"
			)${vars}
		)
	}`
	} else if (type === 'array') {
		result = `\
	static func ${name}() -> [String] {
		return parseItems(
			NSLocalizedString(
				"${escape(key)}",
				comment: "${escape(comment)}"
			)
		)
	}`
	} else {
		return ''
	}
	if (!!comment) {
		result = `\t/// ${comment}\n${result}`
	}
	return result
}

function extractFromSourceJSON() {
	fs.readFile(inputSourceJSONPath, 'utf8', (err, data) => {
		const sourceJSON = JSON.parse(data)

		const en = sourceJSON.map(el => toLocalizedString(el, 'en'))
		const ar = sourceJSON.map(el => toLocalizedString(el, 'ar'))
		const results = [
			{ lang: 'en', values: en },
			{ lang: 'ar', values: ar },
		]
		results.forEach(({ lang, values }) => {
			const content = values.reduce((acc, el) => `${acc}${el}`, '')
			saveToFile(outputLocalizedStringsPath(lang), content, `localized lang ${lang}`)
		})

		const keyCodes = sourceJSON.map(toSwiftCode).reduce((acc, el) => `${acc}${el}\n\n`, '')
		const swiftCode = `enum LocalizedStrings {\n${keyCodes}}`
		saveToFile(outputSwiftPath, swiftCode, 'swift')
	})
}

function saveToFile(path, content, msg) {
	fs.writeFile(path, content, err => {
		// throws an error, you could also catch it here
		if (err) throw err
		// success case, the file was saved
		console.log(`${msg} saved!`)
	})
}

extractFromSourceJSON()
