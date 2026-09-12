import unittest

from nlp.image_model import infer_issue_from_image


class ImageIssueInferenceTests(unittest.TestCase):
    def test_detects_common_civic_issues(self):
        summary = infer_issue_from_image("pothole")
        self.assertIn(summary["category"], {"Roads", "Sanitation", "Water", "Electricity", "Waste"})
        self.assertTrue(summary["issue_text"])
        self.assertIn(summary["priority"], {"Low", "Medium", "High", "Urgent"})

    def test_detects_photo_scenarios_like_accidents_and_burst_pipes(self):
        accident = infer_issue_from_image("car accident on the road with a damaged vehicle")
        self.assertEqual(accident["category"], "Traffic Accident")
        self.assertIn("accident", accident["issue_text"].lower())
        self.assertEqual(accident["priority"], "Urgent")

        burst_pipe = infer_issue_from_image("burst pipe spraying water onto the road")
        self.assertEqual(burst_pipe["category"], "Water")
        self.assertIn("burst pipe", burst_pipe["issue_text"].lower())
        self.assertEqual(burst_pipe["priority"], "Urgent")

    def test_does_not_use_filename_as_issue_description(self):
        result = infer_issue_from_image("")
        self.assertNotIn("screenshot", result["keywords"])
        self.assertEqual(result["confidence"], 0)


if __name__ == "__main__":
    unittest.main()
