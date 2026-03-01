using System.Text.Json.Serialization;

namespace MovieChecker.Domain.Models.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GroupType
{
    Public = 0,
    Private = 1,
    Personal = 2
}
