using System.Text.Json.Serialization;

namespace MovieChecker.Domain.Models.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EntryContentType
{
    Movie,
    Series,
    Anime,
    Cartoon,
    Show
}
