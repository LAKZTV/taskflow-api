package security

import rego.v1

# Clause 1: the npm audit summary reports at least one critical vulnerability.
deny contains msg if {
	input.metadata.vulnerabilities.critical > 0
	msg := sprintf("npm audit reports %d critical vulnerabilities", [input.metadata.vulnerabilities.critical])
}

# Clause 2: name each dependency whose severity is critical.
deny contains msg if {
	some name, v in input.vulnerabilities
	v.severity == "critical"
	msg := sprintf("critical vulnerability in dependency: %s", [name])
}
