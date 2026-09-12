# Category -> responsible municipal department.
# Edit these to match your municipality's real department names.

CATEGORIES = [
    "Water",
    "Roads",
    "Electricity",
    "Street Lighting",
    "Waste",
    "Sanitation",
    "Drainage",
    "Infrastructure",
    "Other",
]

DEPARTMENT_MAP = {
    "Water": "Water Services",
    "Roads": "Roads & Transportation",
    "Electricity": "Electricity & Energy Services",
    "Street Lighting": "Electricity & Energy Services",
    "Waste": "Waste Management",
    "Sanitation": "Sanitation Services",
    "Drainage": "Roads & Transportation",
    "Infrastructure": "Infrastructure & Planning",
    "Other": "General Complaints Office",
}

# Keywords that push a report toward Urgent/High priority regardless of category.
URGENCY_KEYWORDS = {
    "urgent": [
        "burst", "bursting", "flooding", "flood", "raw sewage", "sewage leak",
        "sewage flowing", "fire", "collapsed", "collapse", "exposed wire",
        "live wire", "electrocut", "no water for", "days without water",
        "danger", "dangerous", "life-threatening", "clinic", "hospital",
    ],
    "high": [
        "children", "school", "elderly", "pensioners", "disabled",
        "several days", "three days", "week", "multiple", "many residents",
        "health risk", "smell", "contaminat",
    ],
    "low": [
        "one light", "single light", "minor", "small", "cosmetic",
    ],
}
